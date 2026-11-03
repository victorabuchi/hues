// Average color of each image, as sRGB hex. Used to rank wallpapers by how
// well they match a palette's background. CoreImage does the downsampling.
// usage: swift avgcolor.swift img1 img2 ...
// out:   "<hex>\t<width>x<height>\t<path>" per image, or "ERR\t...\t<path>".
import CoreImage
import Foundation
import AppKit

let ctx = CIContext(options: [.workingColorSpace: CGColorSpace(name: CGColorSpace.sRGB)!])

for p in CommandLine.arguments.dropFirst() {
    guard let img = CIImage(contentsOf: URL(fileURLWithPath: p)) else {
        print("ERR\t0x0\t\(p)"); continue
    }
    let extent = img.extent
    guard let filter = CIFilter(name: "CIAreaAverage",
                                parameters: [kCIInputImageKey: img,
                                             kCIInputExtentKey: CIVector(cgRect: extent)]),
          let out = filter.outputImage else {
        print("ERR\t0x0\t\(p)"); continue
    }
    var px = [UInt8](repeating: 0, count: 4)
    ctx.render(out,
               toBitmap: &px,
               rowBytes: 4,
               bounds: CGRect(x: 0, y: 0, width: 1, height: 1),
               format: .RGBA8,
               colorSpace: CGColorSpace(name: CGColorSpace.sRGB)!)
    let hex = String(format: "#%02x%02x%02x", px[0], px[1], px[2])
    print("\(hex)\t\(Int(extent.width))x\(Int(extent.height))\t\(p)")
}
