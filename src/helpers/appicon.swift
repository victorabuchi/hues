// App-icon recolouring. AppKit owns both ends of this: NSWorkspace is the only
// supported way to read an app's composited icon and to set a custom one, and
// setIcon(nil,...) is the documented way to put the original back.
//
//   appicon.swift probe  <app.app>
//   appicon.swift apply  <app.app> <out.png> <hex> <hex> ...
//   appicon.swift clear  <app.app>
import AppKit
import Foundation

struct RGB { let r: Double, g: Double, b: Double }

func parse(_ hex: String) -> RGB? {
    let s = hex.hasPrefix("#") ? String(hex.dropFirst()) : hex
    guard s.count == 6, let n = UInt32(s, radix: 16) else { return nil }
    return RGB(r: Double((n >> 16) & 0xff), g: Double((n >> 8) & 0xff), b: Double(n & 0xff))
}

/// Perceptual-ish weighting: the eye is most sensitive to green, least to blue.
/// Plain Euclidean RGB distance picks visibly wrong palette entries on skin
/// tones and blues, which is most of a typical icon set.
func dist(_ a: RGB, _ b: RGB) -> Double {
    let dr = a.r - b.r, dg = a.g - b.g, db = a.b - b.b
    return 2.0 * dr * dr + 4.0 * dg * dg + 3.0 * db * db
}

func bitmap(from image: NSImage, size: Int) -> NSBitmapImageRep? {
    guard let rep = NSBitmapImageRep(
        bitmapDataPlanes: nil, pixelsWide: size, pixelsHigh: size,
        bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
        colorSpaceName: .deviceRGB, bytesPerRow: size * 4, bitsPerPixel: 32) else { return nil }
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
    image.draw(in: NSRect(x: 0, y: 0, width: size, height: size),
               from: .zero, operation: .copy, fraction: 1.0)
    NSGraphicsContext.restoreGraphicsState()
    return rep
}

let args = CommandLine.arguments
guard args.count >= 3 else {
    FileHandle.standardError.write("usage: appicon.swift <probe|apply|clear> <app> [...]\n".data(using: .utf8)!)
    exit(2)
}
let cmd = args[1]
let appPath = args[2]
let ws = NSWorkspace.shared

guard FileManager.default.fileExists(atPath: appPath) else { print("ERR\tno such app"); exit(1) }

switch cmd {
case "probe":
    let writable = FileManager.default.isWritableFile(atPath: appPath)
    let icon = ws.icon(forFile: appPath)
    print("\(writable ? "writable" : "readonly")\t\(Int(icon.size.width))x\(Int(icon.size.height))")

case "clear":
    let ok = ws.setIcon(nil, forFile: appPath, options: [])
    print(ok ? "OK\tcleared" : "ERR\tsetIcon(nil) refused")
    exit(ok ? 0 : 1)

case "apply":
    guard args.count >= 5 else { print("ERR\tapply needs <out.png> and palette colours"); exit(2) }
    let outPng = args[3]
    let palette = args[4...].compactMap(parse)
    guard !palette.isEmpty else { print("ERR\tno valid palette colours"); exit(2) }

    let size = 1024
    let icon = ws.icon(forFile: appPath)
    icon.size = NSSize(width: size, height: size)
    guard let rep = bitmap(from: icon, size: size), let data = rep.bitmapData else {
        print("ERR\tcould not rasterise icon"); exit(1)
    }

    // Map every pixel to its nearest palette entry, leaving alpha alone so the
    // icon keeps its silhouette and rounded corners.
    var cache = [UInt32: (UInt8, UInt8, UInt8)]()
    let count = size * size
    for i in 0..<count {
        let o = i * 4
        let a = data[o + 3]
        if a == 0 { continue }
        let key = UInt32(data[o]) << 16 | UInt32(data[o + 1]) << 8 | UInt32(data[o + 2])
        if let hit = cache[key] {
            data[o] = hit.0; data[o + 1] = hit.1; data[o + 2] = hit.2
            continue
        }
        let px = RGB(r: Double(data[o]), g: Double(data[o + 1]), b: Double(data[o + 2]))
        var best = palette[0], bestD = Double.greatestFiniteMagnitude
        for c in palette {
            let d = dist(px, c)
            if d < bestD { bestD = d; best = c }
        }
        let trip = (UInt8(best.r), UInt8(best.g), UInt8(best.b))
        cache[key] = trip
        data[o] = trip.0; data[o + 1] = trip.1; data[o + 2] = trip.2
    }

    guard let png = rep.representation(using: .png, properties: [:]) else {
        print("ERR\tPNG encode failed"); exit(1)
    }
    try? png.write(to: URL(fileURLWithPath: outPng))

    let newIcon = NSImage(size: NSSize(width: size, height: size))
    newIcon.addRepresentation(rep)
    let ok = ws.setIcon(newIcon, forFile: appPath, options: [])
    print(ok ? "OK\t\(outPng)" : "ERR\tsetIcon refused (bundle not writable?)")
    exit(ok ? 0 : 1)

default:
    print("ERR\tunknown command \(cmd)"); exit(2)
}
