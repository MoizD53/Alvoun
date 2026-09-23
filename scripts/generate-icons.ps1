Add-Type -AssemblyName System.Drawing

$sourcePath = "C:/Users/Moizd/.gemini/antigravity/brain/e8b699bb-8d9a-458c-9aa3-189406801423/.user_uploaded/media_1790141503035.jpg"
$destDir = "d:\alvoun\public\icons"

if (-not (Test-Path $destDir)) {
    New-Item -ItemType Directory -Path $destDir -Force | Out-Null
}

$sourceImg = [System.Drawing.Image]::FromFile($sourcePath)

function Resize-Image($size, $outputPath) {
    $bitmap = New-Object System.Drawing.Bitmap $size, $size
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    
    # Draw image centered
    $graphics.DrawImage($sourceImg, 0, 0, $size, $size)
    $graphics.Dispose()
    
    $bitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bitmap.Dispose()
    Write-Host "Generated: $outputPath ($size x $size)"
}

Resize-Image 192 "$destDir\icon-192x192.png"
Resize-Image 512 "$destDir\icon-512x512.png"
Resize-Image 192 "$destDir\icon-maskable-192x192.png"
Resize-Image 512 "$destDir\icon-maskable-512x512.png"
Resize-Image 180 "$destDir\apple-touch-icon.png"
Resize-Image 512 "$destDir\icon.png"

# Also copy 180 as apple-icon.png in app directory for Next.js automatic metadata
Resize-Image 180 "d:\alvoun\src\app\apple-icon.png"
Resize-Image 192 "d:\alvoun\src\app\icon.png"

$sourceImg.Dispose()
Write-Host "All icons successfully created!"
