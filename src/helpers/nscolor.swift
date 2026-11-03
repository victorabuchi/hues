// Archives sRGB hex colors as NSKeyedArchiver blobs in Apple's generic RGB
// space -- byte-for-byte what Terminal.app stores in a .terminal profile.
// AppKit does the colorspace conversion because generic RGB's primaries are
// not public; approximating them with a gamma/matrix is visibly wrong on
// saturated colors.
//
// usage: swift nscolor.swift "#282a36" "#f8f8f2" ...
// out:   one base64 line per argument, in order.
import AppKit
import Foundation

func color(fromHex hex: String) -> NSColor? {
    var s = hex.trimmingCharacters(in: .whitespacesAndNewlines)
    if s.hasPrefix("#") { s.removeFirst() }
    guard s.count == 6, let n = UInt32(s, radix: 16) else { return nil }
    return NSColor(
        srgbRed: CGFloat((n >> 16) & 0xff) / 255.0,
        green:   CGFloat((n >> 8) & 0xff) / 255.0,
        blue:    CGFloat(n & 0xff) / 255.0,
        alpha:   1.0
    )
}

for arg in CommandLine.arguments.dropFirst() {
    guard let c = color(fromHex: arg), let generic = c.usingColorSpace(.genericRGB) else {
        FileHandle.standardError.write("varjo: bad color \(arg)\n".data(using: .utf8)!)
        exit(1)
    }
    let data = try! NSKeyedArchiver.archivedData(withRootObject: generic, requiringSecureCoding: false)
    print(data.base64EncodedString())
}
