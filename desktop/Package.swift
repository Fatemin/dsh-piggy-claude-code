// swift-tools-version: 6.0

import PackageDescription

let package = Package(
    name: "DshPiggyDesk",
    platforms: [
        .macOS(.v13)
    ],
    products: [
        .executable(name: "DshPiggyDesk", targets: ["DshPiggyDesk"])
    ],
    targets: [
        .executableTarget(name: "DshPiggyDesk")
    ]
)
