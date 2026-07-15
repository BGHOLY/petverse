param(
    [string]$ProjectRoot = (Join-Path $PSScriptRoot '../client/PetVerseClient')
)

$ErrorActionPreference = 'Stop'
$buildRoot = Join-Path $ProjectRoot 'build/web-mobile'
$bundleRoot = Join-Path $buildRoot 'assets/resources'
$mainScriptPath = Join-Path $buildRoot 'assets/main/index.js'
$configPath = Join-Path $bundleRoot 'config.json'

if (-not (Test-Path $mainScriptPath) -or -not (Test-Path $configPath)) {
    throw 'The web-mobile preview must exist before illustrated pages can be synchronized.'
}

$assets = @(
    @{ Uuid = 'a406d71b-7e1e-422a-8298-7d5b05b2c683'; Name = 'pet-detail-page-v3'; Path = 'ui/pet-v3/pet-detail-page-v3' },
    @{ Uuid = 'b9e1113b-82ff-4265-8956-28788c5d82fc'; Name = 'shop-page-v3'; Path = 'ui/shop-v3/shop-page-v3' },
    @{ Uuid = 'efc260a9-61af-4538-bb65-82644bad6e58'; Name = 'inventory-page-v3'; Path = 'ui/inventory-v3/inventory-page-v3' },
    @{ Uuid = 'c651be23-96c7-4953-abd5-2f19ebf77f1f'; Name = 'hatchery-page-v3'; Path = 'ui/hatchery-v3/hatchery-page-v3' }
)

$referenceUuid = '62505a80-9372-42ad-a589-20d4834323aa'
$referenceFramePath = Join-Path $bundleRoot "import/62/$referenceUuid@f9941.json"
$referenceImagePath = Join-Path $bundleRoot "import/62/$referenceUuid.json"
$referenceFrame = [System.IO.File]::ReadAllText($referenceFramePath)
$referenceImage = [System.IO.File]::ReadAllText($referenceImagePath)
$config = Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json
$texturePackId = '076a9a173'
$texturePackPath = Join-Path $bundleRoot "import/07/$texturePackId.json"
$texturePack = Get-Content -LiteralPath $texturePackPath -Raw | ConvertFrom-Json

foreach ($asset in $assets) {
    $uuid = $asset.Uuid
    $prefix = $uuid.Substring(0, 2)
    $textureUuid = "$uuid@6c48a"
    $frameUuid = "$uuid@f9941"
    foreach ($id in @($uuid, $textureUuid, $frameUuid)) {
        if ($config.uuids -notcontains $id) {
            $config.uuids += $id
        }
    }
    $pathEntries = @{
        $uuid = @($asset.Path, 'cc.ImageAsset', 1)
        $textureUuid = @("$($asset.Path)/texture", 'cc.Texture2D', 1)
        $frameUuid = @("$($asset.Path)/spriteFrame", 'cc.SpriteFrame', 1)
    }
    foreach ($entry in $pathEntries.GetEnumerator()) {
        if ($config.paths.PSObject.Properties.Name -contains $entry.Key) {
            $config.paths.($entry.Key) = $entry.Value
        } else {
            $config.paths | Add-Member -NotePropertyName $entry.Key -NotePropertyValue $entry.Value
        }
    }
    if ($config.packs.$texturePackId -notcontains $textureUuid) {
        $config.packs.$texturePackId += $textureUuid
        $texturePack.data += ,@('2,2,2,2,0,0', @($uuid))
    }

    $importDirectory = Join-Path $bundleRoot "import/$prefix"
    $nativeDirectory = Join-Path $bundleRoot "native/$prefix"
    New-Item -ItemType Directory -Path $importDirectory, $nativeDirectory -Force | Out-Null
    [System.IO.File]::WriteAllText((Join-Path $importDirectory "$uuid.json"), $referenceImage, (New-Object System.Text.UTF8Encoding($false)))
    $frameJson = $referenceFrame.Replace($referenceUuid, $uuid).Replace('adventure-map-page-v3', $asset.Name)
    [System.IO.File]::WriteAllText((Join-Path $importDirectory "$frameUuid.json"), $frameJson, (New-Object System.Text.UTF8Encoding($false)))
    Copy-Item -LiteralPath (Join-Path $ProjectRoot "assets/resources/$($asset.Path).png") -Destination (Join-Path $nativeDirectory "$uuid.png") -Force
}

[System.IO.File]::WriteAllText($configPath, ($config | ConvertTo-Json -Depth 20 -Compress), (New-Object System.Text.UTF8Encoding($false)))
[System.IO.File]::WriteAllText($texturePackPath, ($texturePack | ConvertTo-Json -Depth 10 -Compress), (New-Object System.Text.UTF8Encoding($false)))

$script:previewScript = [System.IO.File]::ReadAllText($mainScriptPath)
function Replace-Required([string]$Old, [string]$New) {
    if ($script:previewScript.Contains($New)) { return }
    if (-not $script:previewScript.Contains($Old)) { throw "Expected preview fragment was not found: $Old" }
    $script:previewScript = $script:previewScript.Replace($Old, $New)
}

Replace-Required "var book = panel(root, 'PetResearchBook', 0, 0, 706, 904, new Color(255, 246, 218, 255), 24, true, new Color(153, 94, 49, 255), 4);" "artImage(root, 'PetDetailArt', 'ui/pet-v3/pet-detail-page-v3', 0, 0, 720, 1010);`r`n          var book = root;"
Replace-Required "new Color(255, 250, 229, 255), 22, false, new Color(209, 154, 94, 255), 2" "new Color(255, 250, 229, 212), 22, false, new Color(209, 154, 94, 96), 2"
Replace-Required "new Color(249, 247, 227, 255), 22, false, new Color(192, 130, 67, 255), 2" "new Color(249, 247, 227, 210), 22, false, new Color(192, 130, 67, 90), 2"
Replace-Required "new Color(255, 248, 220, 255), 20, false, new Color(177, 112, 57, 255), 2" "new Color(255, 248, 220, 205), 20, false, new Color(177, 112, 57, 96), 2"

$inventoryStart = @'
var cover = panel(root, 'Bag', 0, 0, 692, 905, new Color(151, 105, 62, 255), 32, true, new Color(104, 70, 42, 255), 4);
          var bag = panel(cover, 'PaperBook', 10, -2, 650, 865, new Color(255, 250, 234, 255), 25, false, new Color(220, 190, 145, 255), 3);
          panel(cover, 'BinderSpine', -316, -4, 34, 804, new Color(110, 132, 75, 255), 15, false, new Color(73, 94, 53, 255), 3);
          [278, 94, -90, -274].forEach(function (y, index) {
            panel(cover, "BinderRing_" + index, -311, y, 62, 24, new Color(204, 176, 116, 255), 12, false, new Color(101, 75, 47, 255), 3);
          });
'@
$inventoryNew = @'
artImage(root, 'InventoryPageArt', 'ui/inventory-v3/inventory-page-v3', 0, 0, 720, 1010);
          var bag = root;
'@
Replace-Required $inventoryStart $inventoryNew
Replace-Required "new Color(248, 239, 207, 255), 22, true, CuteTheme.caramelSoft, 3" "new Color(255, 255, 255, 0), 22, false, new Color(255, 255, 255, 0), 0"
Replace-Required "new Color(235, 244, 218, 255), 18, true, CuteTheme.mintDark, 2" "new Color(255, 255, 255, 0), 18, false, new Color(255, 255, 255, 0), 0"
Replace-Required "new Color(247, 238, 214, 255), 18, false, CuteTheme.caramelSoft, 2" "new Color(255, 255, 255, 0), 18, false, new Color(255, 255, 255, 0), 0"
Replace-Required "new Color(246, 241, 218, 255), 17, false, CuteTheme.white, 2" "new Color(255, 252, 239, 188), 17, false, new Color(255, 255, 255, 0), 0"
Replace-Required "new Color(255, 253, 243, 255), 18, false, new Color(223, 199, 160, 255), 2" "new Color(255, 255, 255, 0), 18, false, new Color(255, 255, 255, 0), 0"
Replace-Required "type === 'skill' ? new Color(244, 229, 211, 255) : type === 'consumable' ? new Color(231, 242, 214, 255) : CuteTheme.paper" "type === 'skill' ? new Color(244, 229, 211, 205) : type === 'consumable' ? new Color(231, 242, 214, 205) : new Color(255, 252, 239, 205)"
Replace-Required "new Color(247, 238, 214, 255), 17, false, CuteTheme.caramelSoft, 2" "new Color(255, 255, 255, 0), 17, false, new Color(255, 255, 255, 0), 0"

$shopStart = @'
var frame = panel(root, 'ShopPage', 0, -2, 692, 910, new Color(173, 119, 70, 255), 32, true, new Color(112, 73, 43, 255), 4);
          var page = panel(frame, 'ShopPaper', 0, -4, 654, 866, new Color(255, 249, 231, 255), 24, false, new Color(229, 190, 139, 255), 3);
          var awning = panel(page, 'Awning', 0, 322, 628, 58, new Color(255, 239, 211, 255), 12, false, CuteTheme.caramelSoft, 2);
          [-264, -176, -88, 0, 88, 176, 264].forEach(function (x, index) {
            panel(awning, "Stripe_" + index, x, 0, 78, 48, index % 2 ? new Color(255, 244, 218, 255) : new Color(238, 169, 145, 255), 10, false, CuteTheme.white, 1);
          });
'@
$shopNew = @'
artImage(root, 'ShopPageArt', 'ui/shop-v3/shop-page-v3', 0, 0, 720, 1010);
          var page = root;
'@
Replace-Required $shopStart $shopNew
Replace-Required "new Color(248, 223, 172, 255), 18, true, new Color(139, 92, 51, 255), 4" "new Color(255, 255, 255, 0), 18, false, new Color(255, 255, 255, 0), 0"
Replace-Required "new Color(255, 252, 239, 255), 20, true, CuteTheme.caramelSoft, 2" "new Color(255, 255, 255, 0), 20, false, new Color(255, 255, 255, 0), 0"
Replace-Required "new Color(248, 239, 207, 255), 17, true, CuteTheme.caramelSoft, 2" "new Color(255, 255, 255, 0), 17, false, new Color(255, 255, 255, 0), 0"
Replace-Required "new Color(244, 230, 199, 255), 18, false, new Color(205, 158, 106, 255), 3" "new Color(255, 255, 255, 0), 18, false, new Color(255, 255, 255, 0), 0"
Replace-Required "new Color(255, 253, 243, 255), 16, false, new Color(219, 180, 130, 255), 2" "new Color(255, 255, 255, 0), 16, false, new Color(255, 255, 255, 0), 0"
Replace-Required "new Color(255, 239, 187, 255)" "new Color(255, 239, 187, 220)"
Replace-Required "new Color(255, 252, 239, 255), 18, false, new Color(219, 180, 130, 255), 2" "new Color(255, 252, 239, 205), 18, false, new Color(219, 180, 130, 85), 2"

$hatchStart = @'
var frame = panel(root, 'HatcheryResearch', 0, 0, 692, 905, new Color(169, 121, 78, 255), 32, true, new Color(103, 74, 48, 255), 4);
          var room = panel(frame, 'HatcheryPaper', 0, -2, 654, 865, new Color(255, 249, 231, 255), 24, false, new Color(221, 187, 143, 255), 3);
'@
$hatchNew = @'
artImage(root, 'HatcheryPageArt', 'ui/hatchery-v3/hatchery-page-v3', 0, 0, 720, 1010);
          var room = root;
'@
Replace-Required $hatchStart $hatchNew
Replace-Required "new Color(248, 235, 201, 255), 18, true, CuteTheme.caramelSoft, 3" "new Color(255, 255, 255, 0), 18, false, new Color(255, 255, 255, 0), 0"
Replace-Required "new Color(235, 242, 216, 255), 17, true, CuteTheme.mintDark, 2" "new Color(255, 255, 255, 0), 17, false, new Color(255, 255, 255, 0), 0"
Replace-Required "new Color(191, 202, 184, 255), 30, true, new Color(104, 92, 73, 255), egg != null && egg.isMutant ? 5 : 3" "new Color(255, 255, 255, 0), 30, false, new Color(255, 255, 255, 0), 0"
Replace-Required "egg ? new Color(246, 218, 153, 255) : new Color(205, 224, 199, 255), 24, true, CuteTheme.caramelSoft, 2" "new Color(255, 255, 255, 0), 24, false, new Color(255, 255, 255, 0), 0"
Replace-Required "egg ? new Color(255, 248, 211, 235) : new Color(228, 244, 232, 235), 72, true, egg != null && egg.isMutant ? CuteTheme.honeyDark : CuteTheme.sky, 3" "egg ? new Color(255, 248, 211, 42) : new Color(228, 244, 232, 30), 72, false, new Color(255, 255, 255, 0), 0"
Replace-Required "new Color(222, 231, 218, 255), 6, false, CuteTheme.caramelSoft, 2" "new Color(255, 255, 255, 0), 6, false, new Color(255, 255, 255, 0), 0"
Replace-Required "new Color(198, 174, 135, 255), 18, true, new Color(112, 84, 56, 255), 3" "new Color(255, 255, 255, 0), 18, false, new Color(255, 255, 255, 0), 0"
Replace-Required "new Color(237, 220, 188, 255), 22, true, new Color(139, 101, 66, 255), 3" "new Color(255, 255, 255, 0), 22, false, new Color(255, 255, 255, 0), 0"
Replace-Required "new Color(255, 248, 222, 255), 14, true, CuteTheme.caramelSoft, 2" "new Color(255, 255, 255, 0), 14, false, new Color(255, 255, 255, 0), 0"
Replace-Required "188, 130, rarityColor, 16, true, egg != null && egg.isMutant ? CuteTheme.honeyDark : new Color(189, 151, 106, 255)" "188, 130, new Color(rarityColor.r, rarityColor.g, rarityColor.b, 205), 16, true, egg != null && egg.isMutant ? CuteTheme.honeyDark : new Color(189, 151, 106, 190)"

[System.IO.File]::WriteAllText($mainScriptPath, $script:previewScript, (New-Object System.Text.UTF8Encoding($false)))
Write-Output 'Illustrated pages synchronized to web-mobile preview.'
