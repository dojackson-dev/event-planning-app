$ErrorActionPreference = 'Continue'
Set-Location "c:\Users\larry\event-planning-app"

$success = [System.Collections.Generic.List[string]]::new()
$conflicts = [System.Collections.Generic.List[string]]::new()
$failed = [System.Collections.Generic.List[string]]::new()

$branches = @(
  'Naming-conven','admin-panel','auth','backend','bookings-delete','calendar','cards',
  'client','client-intake','client-login','client-owner-ui','client-page','client-walkthru',
  'contract','dashboard-ui','debug-events','door-list','ent-suite','estimates','events',
  'expo','gen-UI','guest-list','images','invoice-vendor','invoices','items','messages',
  'messaging','multiple-roles','notifications','owner-login','owner-ui','owners',
  'sales-suite','stripe','styles-mobile','testflight','ui-streamline','vendor-invoice',
  'vendors','walk-thru-debug','walkthruedits'
)

foreach ($b in $branches) {
  Write-Host "Processing: $b" -ForegroundColor Cyan
  $localExists = git branch --list $b
  if ($localExists) {
    git checkout $b 2>&1 | Out-Null
  } else {
    git checkout -b $b "origin/$b" 2>&1 | Out-Null
  }
  if ($LASTEXITCODE -ne 0) {
    Write-Host "  CHECKOUT FAILED" -ForegroundColor Red
    $failed.Add($b)
    git checkout dev 2>&1 | Out-Null
    continue
  }

  git merge origin/dev --no-edit 2>&1 | Out-Null
  if ($LASTEXITCODE -eq 0) {
    git push origin $b 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
      Write-Host "  OK" -ForegroundColor Green
      $success.Add($b)
    } else {
      Write-Host "  PUSH FAILED" -ForegroundColor Yellow
      $failed.Add($b)
    }
  } else {
    Write-Host "  CONFLICT - aborting" -ForegroundColor Red
    $conflicts.Add($b)
    git merge --abort 2>&1 | Out-Null
  }
  git checkout dev 2>&1 | Out-Null
}

Write-Host ""
Write-Host "=== RESULTS ===" -ForegroundColor White
Write-Host "SUCCESS  ($($success.Count)): $($success -join ', ')" -ForegroundColor Green
Write-Host "CONFLICT ($($conflicts.Count)): $($conflicts -join ', ')" -ForegroundColor Red
Write-Host "FAILED   ($($failed.Count)): $($failed -join ', ')" -ForegroundColor Yellow
