import Cocoa

/// Menu-bar app: no Dock icon, a floating pig, and a small status menu —
/// the same shape as the traffic-light widget.
@MainActor
final class AppDelegate: NSObject, NSApplicationDelegate {
    private let server = PigServer()
    private let pet = PetWindow()
    private let item = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
    private let statusLineItem = NSMenuItem(title: "🐖 …", action: nil, keyEquivalent: "")
    private var toggleItem: NSMenuItem?
    private var peekTimer: Timer?

    func applicationDidFinishLaunching(_ notification: Notification) {
        setUpStatusItem()
        Task { @MainActor in
            guard await server.ensureRunning() else {
                statusLineItem.title = "面板服务没起来：检查 \(server.root.path)"
                return
            }
            pet.load(server.deskURL)
            pet.show()
            refreshToggleTitle()
            await refreshPeek()
            peekTimer = Timer.scheduledTimer(withTimeInterval: 15, repeats: true) { [weak self] _ in
                Task { @MainActor in await self?.refreshPeek() }
            }
        }
    }

    func applicationWillTerminate(_ notification: Notification) {
        server.stop()
    }

    // MARK: status item

    private func setUpStatusItem() {
        if let image = NSImage(contentsOf: server.artURL) {
            image.size = NSSize(width: 18, height: 18)
            item.button?.image = image
        } else {
            item.button?.title = "🐖"
        }
        let menu = NSMenu()
        menu.addItem(statusLineItem)
        menu.addItem(.separator())
        let toggle = NSMenuItem(title: "隐藏猪", action: #selector(togglePet), keyEquivalent: "")
        toggle.target = self
        toggleItem = toggle
        menu.addItem(toggle)
        menu.addItem(action("猪回到右下角", #selector(resetPosition)))
        menu.addItem(action("在浏览器打开面板", #selector(openInBrowser)))
        menu.addItem(action("重新载入", #selector(reload)))
        menu.addItem(.separator())
        menu.addItem(action("退出", #selector(quit)))
        item.menu = menu
    }

    private func action(_ title: String, _ selector: Selector) -> NSMenuItem {
        let menuItem = NSMenuItem(title: title, action: selector, keyEquivalent: "")
        menuItem.target = self
        return menuItem
    }

    private func refreshPeek() async {
        let line = await server.peek() ?? "🐖 面板服务无响应"
        statusLineItem.title = line
        item.button?.toolTip = line
    }

    private func refreshToggleTitle() {
        toggleItem?.title = pet.isVisible ? "隐藏猪" : "显示猪"
    }

    @objc private func togglePet() {
        if pet.isVisible { pet.hide() } else { pet.show() }
        refreshToggleTitle()
    }

    @objc private func resetPosition() {
        pet.resetPosition()
        pet.show()
        refreshToggleTitle()
    }

    @objc private func openInBrowser() {
        NSWorkspace.shared.open(server.panelURL)
    }

    @objc private func reload() {
        pet.reload()
    }

    @objc private func quit() {
        NSApp.terminate(nil)
    }
}
