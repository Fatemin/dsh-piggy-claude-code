// Render the upstream hand-drawn piglet into the PNGs the app needs
// (app icon, tray icon). macOS only; the outputs are committed, so building
// the app on another platform does not need this.
import Cocoa

let here = URL(fileURLWithPath: CommandLine.arguments[1])
let svg = here.appendingPathComponent("../../assets/piglet.svg").standardized
guard let image = NSImage(contentsOf: svg) else { fatalError("cannot load \(svg.path)") }

func render(_ size: Int, padding: CGFloat, to name: String) {
    let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: size, pixelsHigh: size, bitsPerSample: 8,
                               samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB,
                               bytesPerRow: 0, bitsPerPixel: 0)!
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
    let inset = CGFloat(size) * padding
    image.draw(in: NSRect(x: inset, y: inset, width: CGFloat(size) - 2 * inset, height: CGFloat(size) - 2 * inset))
    NSGraphicsContext.restoreGraphicsState()
    try! rep.representation(using: .png, properties: [:])!.write(to: here.appendingPathComponent(name))
}

render(1024, padding: 0.08, to: "icon.png")
render(16, padding: 0, to: "tray.png")
render(32, padding: 0, to: "tray@2x.png")
print("icons written to \(here.path)")
