Add-Type -AssemblyName System.IO.Compression.FileSystem
$docx = Join-Path $PSScriptRoot 'Diplomna.docx'
$out = Join-Path $PSScriptRoot 'docx_extracted.txt'
$zip = [System.IO.Compression.ZipFile]::OpenRead($docx)
$entry = $zip.Entries | Where-Object { $_.FullName -eq 'word/document.xml' }
$stream = $entry.Open()
$reader = New-Object System.IO.StreamReader($stream)
$xml = $reader.ReadToEnd()
$reader.Close()
$zip.Dispose()
$text = [regex]::Replace($xml, '<w:tab/>', ' ')
$text = [regex]::Replace($text, '</w:p>', "`n")
$text = [regex]::Replace($text, '<[^>]+>', '')
$text = [System.Net.WebUtility]::HtmlDecode($text)
Set-Content -Path $out -Value $text -Encoding UTF8
Write-Output "Wrote $($out)"
