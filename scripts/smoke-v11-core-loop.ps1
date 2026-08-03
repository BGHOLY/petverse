param(
    [string]$BaseUrl = 'http://127.0.0.1:3000/api',
    [int]$UserId = 201
)

$ErrorActionPreference = 'Stop'

function Invoke-PetVerseApi {
    param(
        [string]$Path,
        [string]$Method = 'GET',
        [object]$Body = $null,
        [switch]$WithoutAccount
    )

    $headers = @{ 'Content-Type' = 'application/json' }
    if (-not $WithoutAccount) {
        $headers['X-User-Id'] = [string]$UserId
    }
    $request = @{
        Uri = $BaseUrl.TrimEnd('/') + '/' + $Path.TrimStart('/')
        Headers = $headers
        Method = $Method
    }
    if ($null -ne $Body) {
        $request.Body = $Body | ConvertTo-Json -Depth 12 -Compress
    }
    Invoke-RestMethod @request
}

function Assert-True {
    param([bool]$Condition, [string]$Message)
    if (-not $Condition) { throw $Message }
}

function Complete-TestExpeditions {
    $active = Invoke-PetVerseApi -Path '/expedition/active'
    foreach ($entry in @($active.expeditions)) {
        $complete = Invoke-PetVerseApi -Path '/expedition/dev/complete' -Method 'POST' -Body @{
            expeditionId = [int]$entry.id
        }
        Assert-True ($complete.success -ne $false) "Could not complete stale test expedition $($entry.id)"
        $claim = Invoke-PetVerseApi -Path '/expedition/claim' -Method 'POST' -Body @{
            expeditionId = [int]$entry.id
        }
        Assert-True ($claim.success -ne $false) "Could not claim stale test expedition $($entry.id)"
    }
}

$seed = Invoke-PetVerseApi -Path '/dev/seed-social' -Method 'POST' -Body @{} -WithoutAccount
Assert-True ($seed.success -eq $true) 'Failed to seed isolated V11 test accounts'

Complete-TestExpeditions

$petsBefore = Invoke-PetVerseApi -Path '/pet/my'
$livingPets = @($petsBefore.pets | Where-Object { -not $_.isEgg })
$parentA = $livingPets | Where-Object {
    $_.sourceType -eq 'social_seed' -and $_.speciesCode -eq 'PET009'
} | Select-Object -First 1
$parentB = $livingPets | Where-Object {
    $_.sourceType -eq 'social_seed' -and $_.speciesCode -eq 'PET007'
} | Select-Object -First 1
Assert-True ($null -ne $parentA -and $null -ne $parentB) 'Dedicated fusion parents are missing'

$team = Invoke-PetVerseApi -Path '/team'
Assert-True (@($team.petIds).Count -eq 5) 'The V11 battle team must contain exactly five pets'
$savedTeam = Invoke-PetVerseApi -Path '/team/set' -Method 'POST' -Body @{
    petIds = @($team.petIds)
    formationCode = [string]$team.formationCode
    slotAssignments = @($team.slotAssignments)
    tactics = $team.tactics
}
Assert-True ($savedTeam.success -eq $true) 'Five-pet team save failed'

$cultivatedPetId = [int]$team.petIds[0]
$cultivation = Invoke-PetVerseApi -Path '/inventory/use' -Method 'POST' -Body @{
    itemCode = 'exp_potion_small'
    quantity = 1
    petId = $cultivatedPetId
}
Assert-True ($cultivation.success -eq $true) 'Pet cultivation item use failed'
Assert-True ([int]$cultivation.pet.id -eq $cultivatedPetId) 'Cultivation updated the wrong pet'

$previewBody = @{
    parentAId = [int]$parentA.id
    parentBId = [int]$parentB.id
    seed = "v11-preview-$UserId"
}
$previewBefore = Invoke-PetVerseApi -Path '/fusion/preview' -Method 'POST' -Body $previewBody
Assert-True ($previewBefore.success -eq $true) 'Fusion preview failed for idle parents'

$expeditionRequestId = "v11-expedition-$UserId-$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())"
$expedition = Invoke-PetVerseApi -Path '/expedition/start' -Method 'POST' -Body @{
    mapCode = 'forest'
    durationMinutes = 30
    petIds = @([int]$parentA.id)
    requestId = $expeditionRequestId
}
Assert-True ($expedition.success -eq $true) 'Expedition start failed'

$previewDuring = Invoke-PetVerseApi -Path '/fusion/preview' -Method 'POST' -Body $previewBody
Assert-True ($previewDuring.success -eq $false) 'Fusion must reject a pet on an active expedition'

$complete = Invoke-PetVerseApi -Path '/expedition/dev/complete' -Method 'POST' -Body @{
    expeditionId = [int]$expedition.expedition.id
}
Assert-True ($complete.success -eq $true) 'Expedition fast completion failed in development mode'
$claim = Invoke-PetVerseApi -Path '/expedition/claim' -Method 'POST' -Body @{
    expeditionId = [int]$expedition.expedition.id
}
Assert-True ($claim.success -eq $true) 'Expedition claim failed'
$claimAgain = Invoke-PetVerseApi -Path '/expedition/claim' -Method 'POST' -Body @{
    expeditionId = [int]$expedition.expedition.id
}
Assert-True ($claimAgain.success -eq $false -or $claimAgain.duplicate -eq $true) 'Expedition reward was claimable twice'

$fusionRequestId = "v11-fusion-$UserId-$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())"
$fusion = Invoke-PetVerseApi -Path '/fusion/execute' -Method 'POST' -Body @{
    parentAId = [int]$parentA.id
    parentBId = [int]$parentB.id
    requestId = $fusionRequestId
    seed = "v11-fusion-seed-$fusionRequestId"
    useMutationEssence = $false
}
Assert-True ($fusion.success -eq $true) 'Fusion execution failed after the expedition was claimed'
$fusionAgain = Invoke-PetVerseApi -Path '/fusion/execute' -Method 'POST' -Body @{
    parentAId = [int]$parentA.id
    parentBId = [int]$parentB.id
    requestId = $fusionRequestId
    seed = "v11-fusion-seed-$fusionRequestId"
    useMutationEssence = $false
}
Assert-True ($fusionAgain.success -eq $true -and $fusionAgain.duplicate -eq $true) 'Fusion request id did not prevent duplicate consumption'

$battleStamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$battle = Invoke-PetVerseApi -Path '/battle/v10/start' -Method 'POST' -Body @{
    mode = 'v11-smoke'
    stageCode = "smoke-$battleStamp"
    seed = "v11-battle-$battleStamp"
    difficulty = 0.8
    formationCode = [string]$team.formationCode
}
Assert-True ($battle.success -eq $true) 'Five-pet battle start failed'
$session = $battle.session
$rounds = 0
while ($session.status -eq 'active' -and $rounds -lt 35) {
    $rounds += 1
    $command = Invoke-PetVerseApi -Path '/battle/v10/command' -Method 'POST' -Body @{
        sessionId = [int]$session.id
        type = 'auto'
        requestId = "v11-command-$($session.id)-$rounds"
    }
    Assert-True ($command.success -eq $true) "Battle command failed at round $rounds"
    $session = $command.session
}
Assert-True ($session.status -ne 'active') 'Five-pet battle did not finish within 35 rounds'

$settlementKey = "v11-settle-$($session.battleId)"
$settlement = Invoke-PetVerseApi -Path '/battle/v10/settle' -Method 'POST' -Body @{
    sessionId = [int]$session.id
    settlementKey = $settlementKey
}
Assert-True ($settlement.success -eq $true) 'Battle settlement failed'
$settlementAgain = Invoke-PetVerseApi -Path '/battle/v10/settle' -Method 'POST' -Body @{
    sessionId = [int]$session.id
    settlementKey = $settlementKey
}
Assert-True ($settlementAgain.success -eq $true -and $settlementAgain.duplicate -eq $true) 'Battle reward was claimable twice'

$petsAfter = Invoke-PetVerseApi -Path '/pet/my'
Assert-True (@($petsAfter.pets).Count -eq @($petsBefore.pets).Count - 1) 'Fusion pet count delta is incorrect'

[pscustomobject]@{
    Success = $true
    UserId = $UserId
    CultivatedPetId = $cultivatedPetId
    ExpeditionId = [int]$expedition.expedition.id
    ExpeditionGuard = $previewDuring.message
    FusionPetId = [int]($fusion.pet.id)
    FusionDuplicateProtected = [bool]$fusionAgain.duplicate
    BattleSessionId = [int]$session.id
    BattleRounds = $rounds
    BattleWinner = [string]$session.winnerSide
    BattleDuplicateProtected = [bool]$settlementAgain.duplicate
} | Format-List
