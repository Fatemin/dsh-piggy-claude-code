import Cocoa
import WebKit

/// Borderless panel that may take clicks without activating the app.
private final class PetPanel: NSPanel {
    override var canBecomeKey: Bool { true }
    override var canBecomeMain: Bool { false }
}

/// WebView that reacts to the first click even when its window is not key.
private final class PetWebView: WKWebView {
    override func acceptsFirstMouse(for event: NSEvent?) -> Bool { true }
}

/// The floating pig: a transparent, always-on-top window showing the unmodified
/// upstream panel (`/desk`). Clicks fall through wherever there is no pig, and
/// dragging the pig moves the whole window.
@MainActor
final class PetWindow: NSObject, WKScriptMessageHandler, WKNavigationDelegate {
    /// Tall enough for the panel above a 200 px (120 kg) pig; shorter screens
    /// get a shorter window and the panel shrinks to fit.
    static var size: NSSize {
        let visible = (NSScreen.main ?? NSScreen.screens.first)?.visibleFrame.height ?? 800
        return NSSize(width: 340, height: min(800, visible - 16))
    }
    private static let originKey = "petWindowOrigin"

    let window: NSPanel
    private let webView: WKWebView
    private var hitTimer: Timer?
    private var hitInFlight = false
    private var dragging = false

    override init() {
        window = PetPanel(
            contentRect: NSRect(origin: .zero, size: Self.size),
            styleMask: [.borderless, .nonactivatingPanel],
            backing: .buffered,
            defer: false
        )
        let configuration = WKWebViewConfiguration()
        webView = PetWebView(frame: NSRect(origin: .zero, size: Self.size), configuration: configuration)
        super.init()

        configuration.userContentController.add(WeakMessageHandler(self), name: "pig")
        webView.setValue(false, forKey: "drawsBackground")
        webView.navigationDelegate = self
        webView.autoresizingMask = [.width, .height]

        window.isOpaque = false
        window.backgroundColor = .clear
        window.hasShadow = false
        window.level = .floating
        window.hidesOnDeactivate = false
        window.isReleasedWhenClosed = false
        window.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
        window.ignoresMouseEvents = true
        window.contentView = webView
        restoreOrigin()
    }

    func load(_ url: URL) {
        webView.load(URLRequest(url: url))
    }

    func reload() {
        webView.reload()
    }

    func show() {
        ensureOnScreen()
        window.orderFrontRegardless()
        startHitTesting()
    }

    func hide() {
        window.orderOut(nil)
        hitTimer?.invalidate()
        hitTimer = nil
    }

    var isVisible: Bool { window.isVisible }

    // MARK: click-through

    /// Poll the mouse and let clicks through wherever the page has no pig.
    /// Only asks the page while the cursor is over the window.
    private func startHitTesting() {
        hitTimer?.invalidate()
        hitTimer = Timer.scheduledTimer(withTimeInterval: 1.0 / 30.0, repeats: true) { [weak self] _ in
            MainActor.assumeIsolated { self?.updateHit() }
        }
    }

    private func updateHit() {
        // Mid-press (a drag or a click in progress): keep the events coming.
        if dragging || NSEvent.pressedMouseButtons != 0 && !window.ignoresMouseEvents { return }
        let mouse = NSEvent.mouseLocation
        let frame = window.frame
        guard frame.contains(mouse) else {
            window.ignoresMouseEvents = true
            return
        }
        guard !hitInFlight else { return }
        hitInFlight = true
        let x = mouse.x - frame.minX
        let y = frame.maxY - mouse.y
        webView.evaluateJavaScript("window.__pigHit ? window.__pigHit(\(x), \(y)) : false") { [weak self] result, _ in
            MainActor.assumeIsolated {
                guard let self else { return }
                self.hitInFlight = false
                self.window.ignoresMouseEvents = (result as? Bool) != true
            }
        }
    }

    // MARK: self-check

    /// `PIGGY_DEBUG_SNAPSHOT=<dir>`: once the page is up, write what the window
    /// renders (closed, then with the menu open) and the click-through verdicts
    /// to that directory. Lets the widget be checked without screen recording.
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        guard let dir = ProcessInfo.processInfo.environment["PIGGY_DEBUG_SNAPSHOT"], !dir.isEmpty else { return }
        Task { @MainActor in await self.selfCheck(into: URL(fileURLWithPath: dir, isDirectory: true)) }
    }

    private func selfCheck(into dir: URL) async {
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        try? await Task.sleep(nanoseconds: 2_500_000_000)
        var report: [String] = ["frame=\(NSStringFromRect(window.frame)) visible=\(window.isVisible) level=\(window.level.rawValue)"]
        await snapshot(to: dir.appendingPathComponent("closed.png"))
        report.append("hit(empty 20,20)=\(await evaluate("__pigHit(20,20)"))")
        report.append("hit(pig)=\(await evaluate("(()=>{const r=document.querySelector('.dp-scene').getBoundingClientRect();return __pigHit(r.left+r.width/2,r.top+r.height/2)})()"))")
        _ = await evaluate("document.querySelector('.dp-scene').dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true}))")
        try? await Task.sleep(nanoseconds: 1_000_000_000)
        await snapshot(to: dir.appendingPathComponent("open.png"))
        report.append("open=\(await evaluate("document.querySelector('[data-dsh-pig]').getAttribute('data-open')"))")
        report.append("hit(panel)=\(await evaluate("(()=>{const r=document.querySelector('.dp-card').getBoundingClientRect();return __pigHit(r.left+r.width/2,r.top+30)})()"))")
        report.append("art=\(await evaluate("(()=>{const i=document.querySelector('[data-dsh-pig] img');return i?i.src+' '+i.naturalWidth+'x'+i.naturalHeight+' hidden='+i.hidden:'none'})()"))")
        try? report.joined(separator: "\n").write(to: dir.appendingPathComponent("report.txt"), atomically: true, encoding: .utf8)
    }

    private func evaluate(_ script: String) async -> String {
        await withCheckedContinuation { continuation in
            webView.evaluateJavaScript(script) { result, error in
                continuation.resume(returning: error.map { "error: \($0.localizedDescription)" } ?? String(describing: result ?? "nil"))
            }
        }
    }

    private func snapshot(to url: URL) async {
        let png: Data? = await withCheckedContinuation { continuation in
            webView.takeSnapshot(with: nil) { image, _ in
                let data = image?.tiffRepresentation
                    .flatMap { NSBitmapImageRep(data: $0) }?
                    .representation(using: .png, properties: [:])
                continuation.resume(returning: data)
            }
        }
        try? png?.write(to: url)
    }

    // MARK: page messages

    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any], let type = body["type"] as? String else { return }
        switch type {
        case "drag":
            dragging = true
            let dx = (body["dx"] as? Double) ?? 0
            let dy = (body["dy"] as? Double) ?? 0
            var origin = window.frame.origin
            origin.x += dx
            origin.y -= dy
            window.setFrameOrigin(origin)
        case "dragEnd":
            dragging = false
            saveOrigin()
        default:
            break
        }
    }

    // MARK: placement

    private func restoreOrigin() {
        if let saved = UserDefaults.standard.string(forKey: Self.originKey) {
            let point = NSPointFromString(saved)
            window.setFrameOrigin(point)
        } else {
            placeBottomRight()
        }
    }

    private func saveOrigin() {
        UserDefaults.standard.set(NSStringFromPoint(window.frame.origin), forKey: Self.originKey)
    }

    private func placeBottomRight() {
        guard let screen = NSScreen.main ?? NSScreen.screens.first else { return }
        let visible = screen.visibleFrame
        window.setFrameOrigin(NSPoint(x: visible.maxX - Self.size.width - 12, y: visible.minY + 12))
    }

    /// The pig sits in the window's bottom-right corner; keep that corner on a screen.
    private func ensureOnScreen() {
        let frame = window.frame
        let pigCorner = NSRect(x: frame.maxX - 90, y: frame.minY, width: 90, height: 90)
        if !NSScreen.screens.contains(where: { $0.visibleFrame.intersects(pigCorner) }) {
            placeBottomRight()
            saveOrigin()
        }
    }

    func resetPosition() {
        placeBottomRight()
        saveOrigin()
    }
}

/// WKUserContentController retains its handlers; this breaks the cycle.
@MainActor
private final class WeakMessageHandler: NSObject, WKScriptMessageHandler {
    weak var target: WKScriptMessageHandler?
    init(_ target: WKScriptMessageHandler) { self.target = target }
    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        target?.userContentController(controller, didReceive: message)
    }
}
