# Windows Global System Media Transport Controls → JSON
$ErrorActionPreference = 'Stop'

# UTF-8 für Node (stdout) — Umlaute in Titel/Artist korrekt
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[Console]::OutputEncoding = $utf8NoBom
$OutputEncoding = $utf8NoBom

function Write-MediaJson {
  param([hashtable]$Data)
  $Data | ConvertTo-Json -Compress -Depth 3
}

try {
  Add-Type -AssemblyName System.Runtime.WindowsRuntime

  $asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() |
    Where-Object {
      $_.Name -eq 'AsTask' -and
      $_.IsGenericMethodDefinition -and
      $_.GetParameters().Count -eq 1 -and
      -not $_.GetParameters()[0].ParameterType.IsByRef
    })[0]

  function Await {
    param($WinRtTask, [Type]$ResultType)
    $asTask = $asTaskGeneric.MakeGenericMethod(@($ResultType))
    $netTask = $asTask.Invoke($null, @($WinRtTask))
    $netTask.Wait(-1) | Out-Null
    return $netTask.Result
  }

  [void][Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType = WindowsRuntime]
  [void][Windows.Storage.Streams.DataReader, Windows.Storage.Streams, ContentType = WindowsRuntime]
  [void][Windows.Security.Cryptography.CryptographicBuffer, Windows.Security.Cryptography, ContentType = WindowsRuntime]

  $manager = Await `
    ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) `
    ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])

  $session = $manager.GetCurrentSession()
  if (-not $session) {
    Write-MediaJson @{
      available = $false
      title     = ''
      artist    = ''
      album     = ''
      status    = 'none'
      appName   = ''
      thumbnailBase64 = $null
      hasTimeline = $false
      positionMs = 0
      durationMs = 0
      timelineUpdatedAtMs = 0
    }
    exit 0
  }

  $playback = $session.GetPlaybackInfo()
  $status = $playback.PlaybackStatus.ToString()

  $source = $session.SourceAppUserModelId
  $appName = if ($source) { $source } else { '' }

  $propsMethod = $session.GetType().GetMethod('TryGetMediaPropertiesAsync')
  $propsResultType = $propsMethod.ReturnType.GenericTypeArguments[0]
  $props = Await ($session.TryGetMediaPropertiesAsync()) ($propsResultType)

  $title = if ($props.Title) { $props.Title } else { '' }
  $artist = if ($props.Artist) { $props.Artist } else { '' }
  $album = if ($props.AlbumTitle) { $props.AlbumTitle } else { '' }

  $thumbnailBase64 = $null
  $thumb = $props.Thumbnail
  if ($thumb) {
    try {
      $stream = Await `
        ($thumb.OpenReadAsync()) `
        ([Windows.Storage.Streams.IRandomAccessStreamWithContentType])

      $size = [uint64]$stream.Size
      if ($size -gt 0 -and $size -lt 5MB) {
        $buffer = New-Object Windows.Storage.Streams.Buffer -ArgumentList $size
        $buffer.Length = $size
        $null = Await `
          ($stream.ReadAsync($buffer, $size, [Windows.Storage.Streams.InputStreamOptions]::None)) `
          ([Windows.Storage.Streams.IBuffer])

        $bytes = New-Object byte[] $size
        [Windows.Security.Cryptography.CryptographicBuffer]::CopyToByteArray($buffer, [ref]$bytes)
        if ($bytes.Length -gt 0) {
          $thumbnailBase64 = [Convert]::ToBase64String($bytes)
        }
      }
    } catch {
      $thumbnailBase64 = $null
    }
  }

  $hasTimeline = $false
  $positionMs = 0
  $durationMs = 0
  $timelineUpdatedAtMs = 0
  try {
    $timeline = $session.GetTimelineProperties()
    $positionMs = [int64][Math]::Round($timeline.Position.TotalMilliseconds)
    $durationMs = [int64][Math]::Round(
      ($timeline.EndTime - $timeline.StartTime).TotalMilliseconds
    )
    if ($durationMs -gt 0) {
      $hasTimeline = $true
      $epoch = [datetime]'1970-01-01T00:00:00Z'
      $timelineUpdatedAtMs = [int64](
        $timeline.LastUpdatedTime.UtcDateTime - $epoch
      ).TotalMilliseconds
    }
  } catch {
    $hasTimeline = $false
  }

  Write-MediaJson @{
    available             = $true
    title                 = $title
    artist                = $artist
    album                 = $album
    status                = $status
    appName               = $appName
    thumbnailBase64       = $thumbnailBase64
    hasTimeline           = $hasTimeline
    positionMs            = $positionMs
    durationMs            = $durationMs
    timelineUpdatedAtMs   = $timelineUpdatedAtMs
  }
} catch {
  Write-MediaJson @{
    available             = $false
    title                 = ''
    artist                = ''
    album                 = ''
    status                = 'error'
    appName               = ''
    thumbnailBase64       = $null
    hasTimeline           = $false
    positionMs            = 0
    durationMs            = 0
    timelineUpdatedAtMs   = 0
    error                 = $_.Exception.Message
  }
  exit 1
}
