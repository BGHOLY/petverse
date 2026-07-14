param(
    [Parameter(Mandatory = $true)][string]$BackgroundSource,
    [Parameter(Mandatory = $true)][string]$OverlaySource,
    [Parameter(Mandatory = $true)][string]$OutputDirectory
)

Add-Type -AssemblyName System.Drawing

function New-ResizedBitmap {
    param([string]$Path, [int]$Width, [int]$Height)

    $source = [System.Drawing.Bitmap]::FromFile($Path)
    try {
        $target = New-Object System.Drawing.Bitmap($Width, $Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        $graphics = [System.Drawing.Graphics]::FromImage($target)
        try {
            $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
            $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
            $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
            $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
            $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
            $graphics.DrawImage($source, 0, 0, $Width, $Height)
        } finally {
            $graphics.Dispose()
        }
        return $target
    } finally {
        $source.Dispose()
    }
}

function Remove-MagentaKey {
    param([System.Drawing.Bitmap]$Bitmap)

    $rect = New-Object System.Drawing.Rectangle(0, 0, $Bitmap.Width, $Bitmap.Height)
    $data = $Bitmap.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadWrite, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    try {
        $length = [Math]::Abs($data.Stride) * $Bitmap.Height
        $pixels = New-Object byte[] $length
        [System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $pixels, 0, $length)

        for ($y = 0; $y -lt $Bitmap.Height; $y++) {
            $row = $y * $data.Stride
            for ($x = 0; $x -lt $Bitmap.Width; $x++) {
                $index = $row + $x * 4
                $blue = [int]$pixels[$index]
                $green = [int]$pixels[$index + 1]
                $red = [int]$pixels[$index + 2]
                $magentaScore = [Math]::Min($red, $blue) - $green - [Math]::Abs($red - $blue) * 0.35

                if ($magentaScore -ge 105) {
                    $pixels[$index + 3] = 0
                } elseif ($magentaScore -gt 35) {
                    $alpha = [Math]::Round(255 * (105 - $magentaScore) / 70)
                    $pixels[$index + 3] = [byte][Math]::Max(0, [Math]::Min(255, $alpha))
                    $edgeBase = [Math]::Min(255, $green + 38)
                    $pixels[$index] = [byte][Math]::Min($blue, $edgeBase)
                    $pixels[$index + 2] = [byte][Math]::Min($red, $edgeBase)
                }
            }
        }

        [System.Runtime.InteropServices.Marshal]::Copy($pixels, 0, $data.Scan0, $length)
    } finally {
        $Bitmap.UnlockBits($data)
    }
}

function Save-Crop {
    param(
        [System.Drawing.Bitmap]$Source,
        [int]$X,
        [int]$Y,
        [int]$Width,
        [int]$Height,
        [string]$Path
    )

    $crop = New-Object System.Drawing.Bitmap($Width, $Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($crop)
    try {
        $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
        $destination = New-Object System.Drawing.Rectangle(0, 0, $Width, $Height)
        $sourceRect = New-Object System.Drawing.Rectangle($X, $Y, $Width, $Height)
        $graphics.DrawImage($Source, $destination, $sourceRect, [System.Drawing.GraphicsUnit]::Pixel)
        $crop.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
    } finally {
        $graphics.Dispose()
        $crop.Dispose()
    }
}

function Clear-ImageArea {
    param([string]$Path, [int]$Y, [int]$Height)

    $source = [System.Drawing.Bitmap]::FromFile($Path)
    try {
        $copy = New-Object System.Drawing.Bitmap($source.Width, $source.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        $graphics = [System.Drawing.Graphics]::FromImage($copy)
        try {
            $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
            $graphics.DrawImage($source, 0, 0, $source.Width, $source.Height)
            $graphics.FillRectangle([System.Drawing.Brushes]::Transparent, 0, $Y, $source.Width, $Height)
        } finally {
            $graphics.Dispose()
        }
    } finally {
        $source.Dispose()
    }
    try {
        $copy.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
    } finally {
        $copy.Dispose()
    }
}

function Write-CocosImageMeta {
    param([string]$Path, [int]$Width, [int]$Height, [bool]$HasAlpha)

    $metaPath = "$Path.meta"
    if (Test-Path $metaPath) { return }
    $uuid = [Guid]::NewGuid().ToString()
    $displayName = [System.IO.Path]::GetFileNameWithoutExtension($Path)
    $textureUuid = "$uuid@6c48a"
    $frameUuid = "$uuid@f9941"
    $halfWidth = $Width / 2
    $halfHeight = $Height / 2
    $meta = [ordered]@{
        ver = '1.0.27'; importer = 'image'; imported = $true; uuid = $uuid; files = @('.json', '.png')
        subMetas = [ordered]@{
            '6c48a' = [ordered]@{
                importer = 'texture'; uuid = $textureUuid; displayName = $displayName; id = '6c48a'; name = 'texture'
                userData = [ordered]@{ wrapModeS = 'clamp-to-edge'; wrapModeT = 'clamp-to-edge'; imageUuidOrDatabaseUri = $uuid; isUuid = $true; visible = $false; minfilter = 'linear'; magfilter = 'linear'; mipfilter = 'none'; anisotropy = 0 }
                ver = '1.0.22'; imported = $true; files = @('.json'); subMetas = @{}
            }
            'f9941' = [ordered]@{
                importer = 'sprite-frame'; uuid = $frameUuid; displayName = $displayName; id = 'f9941'; name = 'spriteFrame'
                userData = [ordered]@{
                    trimThreshold = 1; rotated = $false; offsetX = 0; offsetY = 0; trimX = 0; trimY = 0
                    width = $Width; height = $Height; rawWidth = $Width; rawHeight = $Height
                    borderTop = 0; borderBottom = 0; borderLeft = 0; borderRight = 0; packable = $true; pixelsToUnit = 100
                    pivotX = 0.5; pivotY = 0.5; meshType = 0
                    vertices = [ordered]@{
                        rawPosition = @(-$halfWidth, -$halfHeight, 0, $halfWidth, -$halfHeight, 0, -$halfWidth, $halfHeight, 0, $halfWidth, $halfHeight, 0)
                        indexes = @(0, 1, 2, 2, 1, 3); uv = @(0, $Height, $Width, $Height, 0, 0, $Width, 0); nuv = @(0, 0, 1, 0, 0, 1, 1, 1)
                        minPos = @(-$halfWidth, -$halfHeight, 0); maxPos = @($halfWidth, $halfHeight, 0)
                    }
                    isUuid = $true; imageUuidOrDatabaseUri = $textureUuid; atlasUuid = ''; trimType = 'auto'
                }
                ver = '1.0.12'; imported = $true; files = @('.json'); subMetas = @{}
            }
        }
        userData = [ordered]@{ type = 'sprite-frame'; fixAlphaTransparencyArtifacts = $false; hasAlpha = $HasAlpha; redirect = $textureUuid }
    }
    $json = $meta | ConvertTo-Json -Depth 12
    [System.IO.File]::WriteAllText($metaPath, $json, (New-Object System.Text.UTF8Encoding($false)))
}

New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null

$background = New-ResizedBitmap -Path $BackgroundSource -Width 720 -Height 1280
$overlay = New-ResizedBitmap -Path $OverlaySource -Width 720 -Height 1280
try {
    Remove-MagentaKey -Bitmap $overlay
    Save-Crop -Source $background -X 0 -Y 140 -Width 720 -Height 1010 -Path (Join-Path $OutputDirectory 'home-room-v3.png')
    Save-Crop -Source $overlay -X 0 -Y 0 -Width 720 -Height 140 -Path (Join-Path $OutputDirectory 'top-overlay-v3.png')
    Save-Crop -Source $overlay -X 0 -Y 140 -Width 720 -Height 1010 -Path (Join-Path $OutputDirectory 'home-overlay-v3.png')
    Save-Crop -Source $overlay -X 0 -Y 1000 -Width 720 -Height 280 -Path (Join-Path $OutputDirectory 'bottom-navigation-v3.png')
    Clear-ImageArea -Path (Join-Path $OutputDirectory 'home-overlay-v3.png') -Y 0 -Height 16
    Clear-ImageArea -Path (Join-Path $OutputDirectory 'home-overlay-v3.png') -Y 910 -Height 100
} finally {
    $background.Dispose()
    $overlay.Dispose()
}

$directoryMeta = "$OutputDirectory.meta"
if (-not (Test-Path $directoryMeta)) {
    $directoryJson = [ordered]@{ ver = '1.2.0'; importer = 'directory'; imported = $true; uuid = [Guid]::NewGuid().ToString(); files = @(); subMetas = @{}; userData = @{} } | ConvertTo-Json -Depth 6
    [System.IO.File]::WriteAllText($directoryMeta, $directoryJson, (New-Object System.Text.UTF8Encoding($false)))
}
Write-CocosImageMeta -Path (Join-Path $OutputDirectory 'home-room-v3.png') -Width 720 -Height 1010 -HasAlpha $false
Write-CocosImageMeta -Path (Join-Path $OutputDirectory 'top-overlay-v3.png') -Width 720 -Height 140 -HasAlpha $true
Write-CocosImageMeta -Path (Join-Path $OutputDirectory 'home-overlay-v3.png') -Width 720 -Height 1010 -HasAlpha $true
Write-CocosImageMeta -Path (Join-Path $OutputDirectory 'bottom-navigation-v3.png') -Width 720 -Height 280 -HasAlpha $true
