param (
    [string]$SourceDir = "c:\Users\syeda\OneDrive\Desktop\hikmah library",
    [string]$DestDesktop = "c:\Users\syeda\OneDrive\Desktop\hikmah-library-full-project.zip",
    [string]$DestLocal = "c:\Users\syeda\OneDrive\Desktop\hikmah library\hikmah-library-full-project.zip",
    [string]$DestArtifact = "C:\Users\syeda\.gemini\antigravity-ide\brain\d62d4258-41e7-48df-8357-c1f58a982d6d\hikmah-library-full-project.zip"
)

$tempDir = Join-Path $env:TEMP ("hikmah_pack_" + (Get-Random))
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

$itemsToCopy = @(
    "src",
    "public",
    "api",
    "dist",
    "tests",
    "scripts",
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    "tsconfig.app.json",
    "tsconfig.node.json",
    "vite.config.ts",
    "index.html",
    "vercel.json",
    "firestore.rules",
    "README.md",
    ".env.example",
    ".gitignore",
    ".oxlintrc.json"
)

foreach ($entry in $itemsToCopy) {
    $srcPath = Join-Path $SourceDir $entry
    if (Test-Path $srcPath) {
        Copy-Item -Path $srcPath -Destination (Join-Path $tempDir $entry) -Recurse -Force
    }
}

$readmeContent = @"
# Hikmah Library & Study Lounge — Complete Project Handover

## Project Overview
Full-stack production-ready web application for Hikmah Library & Study Lounge.
Features:
- Public Homepage (Facility showcase, rules, responsive booking & photo carousel)
- Admin Console (Student registration, fee & renewal tracking, attendance, disciplinary warning engine, CSV export)
- Student Self-Service Portal (Desk allocation, renewal due countdown, disciplinary status)
- Private E2E Encrypted Peer & Admin Chat (SubtleCrypto AES-GCM 256-bit with real-time Google Cloud Firestore synchronization)
- Google Cloud Firestore Live Backend

## How to Run Locally

1. Prerequisites: Node.js (v18+)
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run Development Server:
   ```bash
   npm run dev
   ```
   Open http://localhost:5173

4. Run Production Build:
   ```bash
   npm run build
   ```

5. Run Automated Verification Tests:
   ```bash
   npm test
   ```

## Production Deployment
- Deployed on Vercel: https://hikmah-library.vercel.app
- Google Cloud Firestore Project: hikmah-library-94121
"@
Set-Content -Path (Join-Path $tempDir "HANDOVER-INSTRUCTIONS.md") -Value $readmeContent

if (Test-Path $DestDesktop) { Remove-Item $DestDesktop -Force }
if (Test-Path $DestLocal) { Remove-Item $DestLocal -Force }

Compress-Archive -Path (Join-Path $tempDir "*") -DestinationPath $DestDesktop -CompressionLevel Optimal
Copy-Item -Path $DestDesktop -Destination $DestLocal -Force
Copy-Item -Path $DestDesktop -Destination $DestArtifact -Force

Remove-Item -Path $tempDir -Recurse -Force

Write-Output "ZIP CREATION COMPLETE"
Get-Item $DestDesktop | Select-Object FullName, Length
