# PowerShell Script to move assets to new folder structure

Write-Host "Moving politician assets to new structure..." -ForegroundColor Green

# Function to move assets to both public and build directories
function Move-Asset {
    param([string]$source, [string]$destSuffix)

    # Move to public directory
    $publicDest = "public/assets/images/$destSuffix"
    if (Test-Path $source) {
        Move-Item $source $publicDest -Force
        Write-Host "Moved $(Split-Path $source -Leaf) to public/$destSuffix" -ForegroundColor Yellow
    }

    # Also move to build directory if file exists in build
    $buildSource = $source -replace "^public", "build"
    $buildDest = "build/assets/images/$destSuffix"
    if (Test-Path $buildSource) {
        Move-Item $buildSource $buildDest -Force
        Write-Host "Moved $(Split-Path $buildSource -Leaf) to build/$destSuffix" -ForegroundColor Cyan
    }
}

# Government cards (Regierungskarten) - IDs 1-63
$governmentCards = @(
    "Vladimir_Putin", "Xi_Jinping", "Recep_Tayyip_Erdogan", "Justin_Trudeau", "Volodymyr_Zelenskyy",
    "Ursula_von_der_Leyen", "Narendra_Modi", "Luiz_Inacio_Lula", "Sergey_Lavrov", "Wolfgang_Schaeuble",
    "Jens_Stoltenberg", "Helmut_Schmidt", "Javier_Milei", "Joschka_Fischer", "Kamala_Harris",
    "Olaf_Scholz", "Rishi_Sunak", "Pedro_Sanchez", "Keir_Starmer", "Robert_Gates", "Karl_Rove",
    "Shigeru_Ishiba", "Heidemarie_Wieczorek_Zeul", "Renate_Kuenast", "Rudolf_Scharping", "John_Ashcroft",
    "Tedros_Adhanom_Ghebreyesus", "Tom_Ridge", "Henry_Paulson", "Horst_köhler", "Johannes_Rau",
    "John_Snow", "Karl_Carstens", "Hans_Eichel", "Walter_Scheel", "Werner_Maihofer", "Andrzej_Duda",
    "Anthony_Albanese", "Benjamin_Netanyahu", "Dick_Cheney", "Donald_Trump", "Ebrahim_Raisi",
    "Emmanuel_Macron", "Giorgia_Meloni", "King_Charles_III", "Mohammed_bin_Salman", "Alberto_Gonzales",
    "Annette_Schavan", "Edelgard_Bulmahn", "Erhard_Eppler", "Franz_Josef_Jung", "Friedrich_Merz",
    "Georg_Leber", "Gerhart_Baum", "Hans_Apel", "Hans_Dietrich_Genscher", "Otto_Schily",
    "Peter_Struck", "Rainer_Offergeld", "Colin_Powell", "Condoleezza_Rice", "Donald_Rumsfeld",
    "Christine_Lagarde"
)

# Public cards (Öffentlichkeitskarten) - IDs 64-88
$publicCards = @(
    "Elon_Musk", "Bill_Gates", "Mark_Zuckerberg", "Oprah_Winfrey", "Sam_Altman", "George_Soros",
    "Greta_Thunberg", "Jack_Ma", "Jennifer_Doudna", "Malala_Yousafzai", "Noam_Chomsky", "Roman_Abramovich",
    "Tim_Cook", "Mukesh_Ambani", "Jeff_Bezos", "Alisher_Usmanov", "Zhang_Yiming", "Edward_Snowden",
    "Julian_Assange", "Yuval_Noah_Harari", "Ai_Weiwei", "Alexei_Navalny", "Anthony_Fauci",
    "Warren_Buffett", "Gautam_Adani"
)

# Special cards (Spezialkarten) - IDs 1-40
$specialCards = @(
    "Shadow_Lobbying", "Spin_Doctor", "Digitaler_Wahlkampf", "Partei_Offensive", "Oppositionsblockade",
    "Verzoegerungsverfahren", "Opportunist", "Think_Tank", "Whataboutism", "Influencer_Kampagne",
    "Systemrelevant", "Symbolpolitik", "Koalitionszwang", "Algorithmischer_Diskurs", "Wirtschaftlicher_Druck",
    "Zivilgesellschaft", "Milchglas_Transparenz", "Alternative_Fakten", "Napoleon_Komplex", "Konzernfreundlicher_Algorithmus",
    "Fake_News_Kampagne", "Whistleblower", "Strategische_Enthuellung", "Interne_Fraktionskaempfe", "Boykott_Kampagne",
    "Deepfake_Skandal", "Cyber_Attacke", "Bestechungsskandal_2_0", "Grassroots_Widerstand", "Massenproteste",
    "Berater_Affaere", "Parlament_geschlossen", "Unabhaengige_Untersuchung", "Soft_Power_Kollaps", "Cancel_Culture",
    "Lobby_Leak", "Maulwurf", "Skandalspirale", "Tunnelvision", "Satire_Show"
)

# Initiative cards (IDs 1-12, 13-20)
$initiativeCards = @(
    "Shadow_Lobbying", "Spin_Doctor", "Digitaler_Wahlkampf", "Partei_Offensive", "Oppositionsblockade",
    "Verzoegerungsverfahren", "Opportunist", "Think_Tank", "Whataboutism", "Influencer_Kampagne",
    "Systemrelevant", "Symbolpolitik", "Koalitionszwang", "Algorithmischer_Diskurs", "Wirtschaftlicher_Druck",
    "Zivilgesellschaft", "Milchglas_Transparenz", "Alternative_Fakten", "Napoleon_Komplex", "Konzernfreundlicher_Algorithmus"
)

# Intervention cards (IDs 21-40)
$interventionCards = @(
    "Fake_News_Kampagne", "Whistleblower", "Strategische_Enthuellung", "Interne_Fraktionskaempfe", "Boykott_Kampagne",
    "Deepfake_Skandal", "Cyber_Attacke", "Bestechungsskandal_2_0", "Grassroots_Widerstand", "Massenproteste",
    "Berater_Affaere", "Parlament_geschlossen", "Unabhaengige_Untersuchung", "Soft_Power_Kollaps", "Cancel_Culture",
    "Lobby_Leak", "Maulwurf", "Skandalspirale", "Tunnelvision", "Satire_Show"
)

# Move politician files (256x256)
foreach ($card in $governmentCards) {
    $source = "public/assets/images/politicians_256x256/$card.png"
    Move-Asset -source $source -destSuffix "politicians_256x256/government/$card.png"
}

foreach ($card in $publicCards) {
    $source = "public/assets/images/politicians_256x256/$card.png"
    Move-Asset -source $source -destSuffix "politicians_256x256/public/$card.png"
}

# Move politician files (1024x1024)
foreach ($card in $governmentCards) {
    $source = "public/assets/images/politicians_1024x1024/$card.png"
    Move-Asset -source $source -destSuffix "politicians_1024x1024/government/$card.png"
}

foreach ($card in $publicCards) {
    $source = "public/assets/images/politicians_1024x1024/$card.png"
    Move-Asset -source $source -destSuffix "politicians_1024x1024/public/$card.png"
}

Write-Host "Moving special cards to new structure..." -ForegroundColor Green

# Move special files (256x256) - Initiative
foreach ($card in $initiativeCards) {
    $source = "public/assets/images/specials_256x256/$card.png"
    Move-Asset -source $source -destSuffix "specials_256x256/initiative/$card.png"
}

# Move special files (256x256) - Intervention
foreach ($card in $interventionCards) {
    $source = "public/assets/images/specials_256x256/$card.png"
    Move-Asset -source $source -destSuffix "specials_256x256/intervention/$card.png"
}

# Move special files (1024x1024) - Initiative
foreach ($card in $initiativeCards) {
    $source = "public/assets/images/specials_1024x1024/$card.png"
    Move-Asset -source $source -destSuffix "specials_1024x1024/initiative/$card.png"
}

# Move special files (1024x1024) - Intervention
foreach ($card in $interventionCards) {
    $source = "public/assets/images/specials_1024x1024/$card.png"
    Move-Asset -source $source -destSuffix "specials_1024x1024/intervention/$card.png"
}

Write-Host "Asset reorganization complete!" -ForegroundColor Green
