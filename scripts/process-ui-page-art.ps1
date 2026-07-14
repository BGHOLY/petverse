param(
    [Parameter(Mandatory = $true)][string]$Source,
    [Parameter(Mandatory = $true)][string]$OutputDirectory,
    [Parameter(Mandatory = $true)][string]$OutputName
)

Add-Type -AssemblyName System.Drawing
New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null

$outputPath = Join-Path $OutputDirectory "$OutputName.png"
$sourceBitmap = [System.Drawing.Bitmap]::FromFile($Source)
$target = New-Object System.Drawing.Bitmap(720, 1010, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$graphics = [System.Drawing.Graphics]::FromImage($target)
try {
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.DrawImage($sourceBitmap, 0, 0, 720, 1010)
    $target.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
} finally {
    $graphics.Dispose()
    $target.Dispose()
    $sourceBitmap.Dispose()
}

$directoryMeta = "$OutputDirectory.meta"
if (-not (Test-Path $directoryMeta)) {
    $meta = [ordered]@{ ver = '1.2.0'; importer = 'directory'; imported = $true; uuid = [Guid]::NewGuid().ToString(); files = @(); subMetas = @{}; userData = @{} }
    [System.IO.File]::WriteAllText($directoryMeta, ($meta | ConvertTo-Json -Depth 6), (New-Object System.Text.UTF8Encoding($false)))
}

$imageMetaPath = "$outputPath.meta"
if (-not (Test-Path $imageMetaPath)) {
    $uuid = [Guid]::NewGuid().ToString()
    $textureUuid = "$uuid@6c48a"
    $frameUuid = "$uuid@f9941"
    $meta = [ordered]@{
        ver = '1.0.27'; importer = 'image'; imported = $true; uuid = $uuid; files = @('.json', '.png')
        subMetas = [ordered]@{
            '6c48a' = [ordered]@{
                importer = 'texture'; uuid = $textureUuid; displayName = $OutputName; id = '6c48a'; name = 'texture'
                userData = [ordered]@{ wrapModeS = 'clamp-to-edge'; wrapModeT = 'clamp-to-edge'; imageUuidOrDatabaseUri = $uuid; isUuid = $true; visible = $false; minfilter = 'linear'; magfilter = 'linear'; mipfilter = 'none'; anisotropy = 0 }
                ver = '1.0.22'; imported = $true; files = @('.json'); subMetas = @{}
            }
            'f9941' = [ordered]@{
                importer = 'sprite-frame'; uuid = $frameUuid; displayName = $OutputName; id = 'f9941'; name = 'spriteFrame'
                userData = [ordered]@{
                    trimThreshold = 1; rotated = $false; offsetX = 0; offsetY = 0; trimX = 0; trimY = 0
                    width = 720; height = 1010; rawWidth = 720; rawHeight = 1010
                    borderTop = 0; borderBottom = 0; borderLeft = 0; borderRight = 0; packable = $true; pixelsToUnit = 100
                    pivotX = 0.5; pivotY = 0.5; meshType = 0
                    vertices = [ordered]@{
                        rawPosition = @(-360, -505, 0, 360, -505, 0, -360, 505, 0, 360, 505, 0)
                        indexes = @(0, 1, 2, 2, 1, 3); uv = @(0, 1010, 720, 1010, 0, 0, 720, 0); nuv = @(0, 0, 1, 0, 0, 1, 1, 1)
                        minPos = @(-360, -505, 0); maxPos = @(360, 505, 0)
                    }
                    isUuid = $true; imageUuidOrDatabaseUri = $textureUuid; atlasUuid = ''; trimType = 'auto'
                }
                ver = '1.0.12'; imported = $true; files = @('.json'); subMetas = @{}
            }
        }
        userData = [ordered]@{ type = 'sprite-frame'; fixAlphaTransparencyArtifacts = $false; hasAlpha = $false; redirect = $textureUuid }
    }
    [System.IO.File]::WriteAllText($imageMetaPath, ($meta | ConvertTo-Json -Depth 12), (New-Object System.Text.UTF8Encoding($false)))
}

Write-Output $outputPath
