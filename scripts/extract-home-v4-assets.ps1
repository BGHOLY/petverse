param(
    [string]$SourceDirectory = (Join-Path $PSScriptRoot '../client/PetVerseClient/assets/resources/ui/home-v3'),
    [string]$OutputDirectory = (Join-Path $PSScriptRoot '../client/PetVerseClient/assets/resources/ui/home-v4')
)

Add-Type -AssemblyName System.Drawing

function Save-Crop {
    param([System.Drawing.Bitmap]$Source, [int]$X, [int]$Y, [int]$Width, [int]$Height, [string]$Path)

    $target = New-Object System.Drawing.Bitmap($Width, $Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($target)
    try {
        $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
        $graphics.DrawImage(
            $Source,
            (New-Object System.Drawing.Rectangle(0, 0, $Width, $Height)),
            (New-Object System.Drawing.Rectangle($X, $Y, $Width, $Height)),
            [System.Drawing.GraphicsUnit]::Pixel
        )
        $target.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
    } finally {
        $graphics.Dispose()
        $target.Dispose()
    }
}

function Write-CocosImageMeta {
    param([string]$Path, [int]$Width, [int]$Height)

    $metaPath = "$Path.meta"
    if (Test-Path $metaPath) { return }
    $uuid = [Guid]::NewGuid().ToString()
    $textureUuid = "$uuid@6c48a"
    $frameUuid = "$uuid@f9941"
    $displayName = [System.IO.Path]::GetFileNameWithoutExtension($Path)
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
        userData = [ordered]@{ type = 'sprite-frame'; fixAlphaTransparencyArtifacts = $false; hasAlpha = $true; redirect = $textureUuid }
    }
    [System.IO.File]::WriteAllText($metaPath, ($meta | ConvertTo-Json -Depth 12), (New-Object System.Text.UTF8Encoding($false)))
}

New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null

$overlay = [System.Drawing.Bitmap]::FromFile((Join-Path $SourceDirectory 'home-overlay-v3.png'))
$navigation = [System.Drawing.Bitmap]::FromFile((Join-Path $SourceDirectory 'bottom-navigation-v3.png'))
try {
    $crops = @(
        @('activity-sign', 0, 120, 150, 165),
        @('activity-newcomer', 0, 280, 150, 150),
        @('activity-daily', 0, 425, 150, 155),
        @('activity-events', 0, 575, 150, 155),
        @('shortcut-adventure', 570, 120, 150, 170),
        @('shortcut-hatchery', 570, 285, 150, 150),
        @('shortcut-formation', 570, 425, 150, 160),
        @('pet-nameplate', 360, 745, 240, 120)
    )
    foreach ($crop in $crops) {
        Save-Crop -Source $overlay -X $crop[1] -Y $crop[2] -Width $crop[3] -Height $crop[4] -Path (Join-Path $OutputDirectory "$($crop[0])-v4.png")
        Write-CocosImageMeta -Path (Join-Path $OutputDirectory "$($crop[0])-v4.png") -Width $crop[3] -Height $crop[4]
    }
    Save-Crop -Source $navigation -X 0 -Y 35 -Width 720 -Height 205 -Path (Join-Path $OutputDirectory 'bottom-navigation-v4.png')
    Write-CocosImageMeta -Path (Join-Path $OutputDirectory 'bottom-navigation-v4.png') -Width 720 -Height 205
} finally {
    $overlay.Dispose()
    $navigation.Dispose()
}

$directoryMeta = "$OutputDirectory.meta"
if (-not (Test-Path $directoryMeta)) {
    $meta = [ordered]@{ ver = '1.2.0'; importer = 'directory'; imported = $true; uuid = [Guid]::NewGuid().ToString(); files = @(); subMetas = @{}; userData = @{} }
    [System.IO.File]::WriteAllText($directoryMeta, ($meta | ConvertTo-Json -Depth 6), (New-Object System.Text.UTF8Encoding($false)))
}
