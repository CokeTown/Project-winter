# gen-sfx.ps1 - Convert Pro Sound Effects CORE sampler WAVs (and cat mp3s)
# into game-ready ogg SFX under public/sfx/.
# Rules: 44.1kHz, mono (ambience stays stereo), libvorbis -q 3,
#        loudnorm I=-18 TP=-1.5, loops get 0.5s edge fades.
# ASCII only. Run from anywhere; paths are absolute.

$ErrorActionPreference = 'Stop'

$ff = Join-Path $env:LOCALAPPDATA 'ffmpeg\bin\ffmpeg.exe'
if (-not (Test-Path $ff)) { throw "ffmpeg not found at $ff" }

$outDir = 'G:\Project_winter\public\sfx'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$P1 = 'G:\Sample\Pro Sound Effects - CORE Free Sampler - Part01'
$P2 = 'G:\Sample\Pro Sound Effects - CORE Free Sampler - Part02'
$CAT = 'G:\Project_winter\assets-src\Cat_sound'
$RAIN = 'G:\Project_winter\assets-src\Rain_SFX'
$ASRC = 'G:\Project_winter\assets-src'

# name, source, seek(s), dur(s), channels(1|2), extra filter chain (before loudnorm/fades), fadeIn, fadeOut
$jobs = @(
  @{ n='amb_rain';     s="$P2\Rain\RAIN_Rainfall Storm Alley Occasional Individual Water Drops on Car Roof_PSE_RN_6Bvwn.wav"; ss=40;  t=30;  ch=2; fi=0.5; fo=0.5 }
  @{ n='amb_wind';     s="$P2\Wind\WIND_Whistling Wind Calm with Random Swells_PSE_CW2_xkKjB.wav";                            ss=1;   t=30;  ch=2; fi=0.5; fo=0.5 }
  @{ n='amb_storm';    s="$P2\Wind\WINDTonl_Storm Winds Strong Gusting_PSE_CW_6vM5w.wav";                                     ss=5;   t=25;  ch=2; fi=0.5; fo=0.5 }
  @{ n='amb_fire';     s="$P2\Fire\FIRECrkl_Fireplace Wood Burns Low Fire Interior_PSE_EMB_tcQmf.wav";                        ss=30;  t=25;  ch=2; fi=0.5; fo=0.5 }
  @{ n='radio_static'; s="$P2\Communications\COMStatic_EM Telemetry Machine Room_PSE_INT_JL29X.wav";                          ss=10;  t=10;  ch=1; fi=0.5; fo=0.5 }
  @{ n='door';         s="$P2\Doors\DOORWood_Old Wood Door Interior Open Close_PSE_DRS_ikzBU.wav";                            ss=0;   t=2.5; ch=1; trim=1; fo=0.15 }
  @{ n='steps_snow';   s="$P2\Foley\FOLYFeet_Footsteps Snow Thin and Crunchy Normal Pace_PSE_OF_jhCJe.wav";                   ss=1;   t=2.5; ch=1; trim=1; fo=0.2 }
  @{ n='steps_hard';   s="$P2\Foley\FOLYFeet_Footsteps Hard Sole Shoe_PSE_FESS_VynYG.wav";                                    ss=1;   t=2.5; ch=1; trim=1; fo=0.2 }
  @{ n='place';        s="$P2\Metal\METLImpt_Wood Metal_PSE_MTLK_DMIGX.wav";                                                  ss=0;   t=0.8; ch=1; trim=1; fo=0.1 }
  @{ n='craft';        s="$P2\Metal\METLImpt_Anvil Heavy Metal Impacts 038 B_PSE_SONBSM_NeRO2.wav";                           ss=0;   t=1.2; ch=1; trim=1; fo=0.15 }
  @{ n='whoosh';       s="$P2\Swooshes\SWSH_Palm Frond Whoosh Fast Stereo 090_PSE_WPA_0Vcbe.wav";                             ss=0;   t=0.8; ch=1; trim=1; fo=0.1 }
  @{ n='dawn';         s="$P1\Birds\BIRDSong_Southern Hardwood Forest Song Birds Crickets Dawn Stereo 034_PSE_BIO_BfR7E.wav"; ss=20;  t=4;   ch=1; fi=0.3; fo=1.2 }
  @{ n='sting';        s="$P2\Designed\DSGNMisc_Frost Freeze with Chimes_PSE_KCV2_ow910.wav";                                 ss=0;   t=3;   ch=1; trim=1; fo=0.5 }
  @{ n='alarm';        s="$P2\Designed\DSGNBass_Cinematic Sci Fi Bass Drop Deep Alarm 042a_PSE_DRKM_HFIzP.wav";               ss=0;   t=1.2; ch=1; trim=1; fo=0.15 }
  @{ n='ring';         s="$P2\Glass\GLASMisc_Crystal Champagne Glass High Pitch Ringing 04_PSE_SONCS_dxUq1.wav";              ss=0;   t=2;   ch=1; trim=1; fo=0.6 }
  @{ n='pen';          s="$P2\Objects\OBJWrite_Ball Point Pen Calligraphy Script Sketch Paper Fast Writing_PSE_HWR_LMVJS.wav"; ss=1;  t=1.5; ch=1; fo=0.2 }
  @{ n='heli';         s="$P1\Aircraft\AEROProp_Bandeirante Start Taxi Away Takeoff_PSE_KCACP_4eAIO.wav";                     ss=110; t=8;   ch=1; fi=1.5; fo=1.5 }
  @{ n='meow1';        s="$CAT\meow1.mp3";      ch=1 }
  @{ n='meow2';        s="$CAT\meow2.mp3";      ch=1 }
  @{ n='meow3';        s="$CAT\meow3.mp3";      ch=1 }
  @{ n='cat_eat';      s="$CAT\cat_eating.mp3"; ss=0; t=3; ch=1; fo=0.3 }
  # region-specific rain loops (v2.4 rework #22): 25-30s stereo loops, quieter loudnorm
  @{ n='rain_roof';    s="$RAIN\Rain_on_roof.mp3"; ss=20; t=28; ch=2; fi=0.5; fo=0.5 }
  @{ n='rain_city';    s="$RAIN\City_rain.mp3";    ss=20; t=28; ch=2; fi=0.5; fo=0.5 }
  @{ n='rain_forest';  s="$RAIN\Forest_Rain.mp3";  ss=20; t=28; ch=2; fi=0.5; fo=0.5 }
  @{ n='rain_road';    s="$RAIN\Road_rain.mp3";    ss=20; t=28; ch=2; fi=0.5; fo=0.5 }
  @{ n='rain_heavy';   s="$RAIN\Heavy_Rain.mp3";   ss=10; t=27; ch=2; fi=0.5; fo=0.5 }
  # radio noise: one-shot click sound, mono, quieter loudnorm
  @{ n='radio_noise';  s="$ASRC\radio_noise.mp3";  ss=0;  ch=1; loudI=-24 }
)

foreach ($j in $jobs) {
  if (-not (Test-Path $j.s)) { Write-Warning "SKIP (missing source): $($j.n)"; continue }
  $out = Join-Path $outDir "$($j.n).ogg"

  $filters = @()
  if ($j.trim) { $filters += 'silenceremove=start_periods=1:start_threshold=-45dB' }
  $loudI = if ($j.ContainsKey('loudI')) { $j.loudI } else { -18 }
  $filters += "loudnorm=I=$($loudI):TP=-1.5"
  if ($j.fi) { $filters += "afade=t=in:st=0:d=$($j.fi)" }
  if ($j.fo -and $j.t) {
    $st = [math]::Round(($j.t - $j.fo), 2)
    $filters += "afade=t=out:st=${st}:d=$($j.fo)"
  }
  $fchain = $filters -join ','

  $args = @('-hide_banner', '-loglevel', 'error', '-y')
  if ($j.ContainsKey('ss') -and $j.ss -gt 0) { $args += @('-ss', "$($j.ss)") }
  $args += @('-i', $j.s)
  if ($j.ContainsKey('t')) { $args += @('-t', "$($j.t)") }
  $args += @('-af', $fchain, '-ac', "$($j.ch)", '-ar', '44100', '-c:a', 'libvorbis', '-q:a', '3', $out)

  Write-Host "[$($j.n)] converting..."
  & $ff @args
  if ($LASTEXITCODE -ne 0) { throw "ffmpeg failed for $($j.n)" }
}

Write-Host ''
Write-Host '== output =='
Get-ChildItem $outDir -Filter *.ogg | Sort-Object Name | ForEach-Object {
  '{0,-18} {1,8:N1} KB' -f $_.Name, ($_.Length / 1KB)
}
