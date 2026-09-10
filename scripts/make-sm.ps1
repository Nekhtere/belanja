# Generates the 500px rendition of every product photo from the 1000px master.
#
# Downscaling locally rather than re-fetching from the image host on purpose:
# the crop is guaranteed identical to the large file (a second request could
# come back with a different crop or a different photo entirely), it needs no
# network, and it is reproducible from the masters alone. Re-run this after
# replacing any master in src/assets/produk/.
#
# Usage:  powershell -ExecutionPolicy Bypass -File scripts/make-sm.ps1

Add-Type -AssemblyName System.Drawing

$dir = Join-Path $PSScriptRoot '..\src\assets\produk' | Resolve-Path
$names = @(
  'kaos', 'kemeja', 'jaket', 'dress', 'celana', 'tote',
  'ransel', 'sling', 'parfum-cedar', 'parfum-neroli', 'jam', 'topi'
)

$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
  Where-Object { $_.MimeType -eq 'image/jpeg' }

foreach ($n in $names) {
  $src = Join-Path $dir "$n.jpg"
  $dst = Join-Path $dir "$n-sm.jpg"
  if (-not (Test-Path $src)) { Write-Output ("{0,-24} MISSING" -f "$n.jpg"); continue }

  $img = [System.Drawing.Image]::FromFile($src)
  $bmp = New-Object System.Drawing.Bitmap -ArgumentList 500, 625
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.DrawImage($img, 0, 0, 500, 625)

  $ep = New-Object System.Drawing.Imaging.EncoderParameters -ArgumentList 1
  $ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter -ArgumentList (
    [System.Drawing.Imaging.Encoder]::Quality), ([long]72)
  $bmp.Save($dst, $codec, $ep)

  $g.Dispose(); $bmp.Dispose(); $img.Dispose()
  Write-Output ("{0,-24} {1}" -f "$n-sm.jpg", (Get-Item $dst).Length)
}
