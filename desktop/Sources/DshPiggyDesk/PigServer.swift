import Foundation

/// The node panel server (`pig serve`) that owns the save file.
///
/// Reuses one that is already running (another desk instance, or a manual
/// `pig serve`); otherwise starts its own child and stops it on quit, which
/// makes the server flush the save.
@MainActor
final class PigServer {
    let root: URL
    let port: Int
    private var child: Process?

    init(environment: [String: String] = ProcessInfo.processInfo.environment) {
        if let configured = environment["PIGGY_ROOT"], !configured.isEmpty {
            root = URL(fileURLWithPath: configured, isDirectory: true)
        } else {
            root = Self.repositoryRoot() ?? FileManager.default.homeDirectoryForCurrentUser
                .appendingPathComponent("dsh-piggy-claude-code", isDirectory: true)
        }
        port = Int(environment["PIG_PORT"] ?? "") ?? 41717
    }

    /// The checkout this binary was built in: walk up from the executable
    /// (`desktop/.build/release/DshPiggyDesk`) until `bin/pig.js` shows up.
    private static func repositoryRoot() -> URL? {
        guard var dir = Bundle.main.executableURL?.resolvingSymlinksInPath().deletingLastPathComponent() else { return nil }
        for _ in 0..<8 {
            if FileManager.default.fileExists(atPath: dir.appendingPathComponent("bin/pig.js").path) { return dir }
            let parent = dir.deletingLastPathComponent()
            if parent.path == dir.path { break }
            dir = parent
        }
        return nil
    }

    var baseURL: URL { URL(string: "http://127.0.0.1:\(port)/")! }
    var deskURL: URL { baseURL.appendingPathComponent("desk") }
    var panelURL: URL { baseURL }
    var artURL: URL { root.appendingPathComponent("assets/piglet.svg") }

    /// Make sure a server answers; true once it does.
    func ensureRunning() async -> Bool {
        if await isHealthy() { return true }
        startChild()
        for _ in 0..<50 {
            try? await Task.sleep(nanoseconds: 100_000_000)
            if await isHealthy() { return true }
        }
        return false
    }

    func stop() {
        guard let child, child.isRunning else { return }
        child.terminate()
        let deadline = Date().addingTimeInterval(2)
        while child.isRunning && Date() < deadline {
            RunLoop.current.run(until: Date().addingTimeInterval(0.05))
        }
    }

    func peek() async -> String? {
        struct Peek: Decodable { let line: String }
        guard let data = await get("pig/peek", timeout: 1) else { return nil }
        return (try? JSONDecoder().decode(Peek.self, from: data))?.line
    }

    private func isHealthy() async -> Bool {
        await get("pig/health", timeout: 0.5) != nil
    }

    private func get(_ path: String, timeout: TimeInterval) async -> Data? {
        var request = URLRequest(url: baseURL.appendingPathComponent(path))
        request.timeoutInterval = timeout
        request.cachePolicy = .reloadIgnoringLocalCacheData
        guard let (data, response) = try? await URLSession.shared.data(for: request),
              (response as? HTTPURLResponse)?.statusCode == 200 else { return nil }
        return data
    }

    private func startChild() {
        if let child, child.isRunning { return }
        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/bin/sh")
        process.arguments = [
            root.appendingPathComponent("bin/pig-node.sh").path,
            root.appendingPathComponent("bin/pig.js").path,
            "serve",
        ]
        var environment = ProcessInfo.processInfo.environment
        environment["PIG_PORT"] = String(port)
        // If this app dies without a clean quit, the server notices and exits.
        environment["PIG_PARENT_PID"] = String(ProcessInfo.processInfo.processIdentifier)
        process.environment = environment
        process.standardOutput = FileHandle.nullDevice
        process.standardError = FileHandle.nullDevice
        do {
            try process.run()
            child = process
        } catch {
            NSLog("dsh-piggy: failed to start pig server: \(error)")
        }
    }
}
