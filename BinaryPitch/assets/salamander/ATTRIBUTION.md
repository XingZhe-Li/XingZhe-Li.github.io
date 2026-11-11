# Salamander Grand Piano recordings

**Work:** Salamander Grand Piano, recorded from a Yamaha C5 grand piano.

**Author:** Alexander Holm.

**License for the recordings:** [Creative Commons Attribution 3.0 Unported (CC BY 3.0)](https://creativecommons.org/licenses/by/3.0/).

The 30 MP3 recordings in this directory are redistributed from the official
[Tonejs/audio Salamander directory](https://github.com/Tonejs/audio/tree/efd8296360f9526e379bfbe5c1698ff54d6a1d34/salamander),
pinned at commit `efd8296360f9526e379bfbe5c1698ff54d6a1d34`.
The original upstream [README](README) identifies Alexander Holm, the Yamaha C5,
and the CC BY 3.0 license. The complete license is retained in
[LICENSE-CC-BY-3.0.txt](LICENSE-CC-BY-3.0.txt).

These are the MP3 distribution provided by Tone.js, rather than the complete
original multi-velocity SFZ library. The upstream MP3 files have not been
modified or re-encoded by BinaryPitch. During playback, BinaryPitch adapts the
recordings through resampling for neighboring pitches and gain/envelope
adjustments; the bright-piano voice additionally applies equalization. These
playback changes are made by BinaryPitch, not by the original author.

The application code's license does not replace the separate CC BY 3.0 license
for these recordings. No affiliation with or endorsement by Alexander Holm,
Tone.js, or Yamaha is asserted.

`SOURCE.json` lists exact source URLs, byte lengths and SHA-256 checksums.
Reproduce or verify the local distribution with:

```sh
node scripts/download-samples.mjs
node scripts/download-samples.mjs --verify-only
```

The download script retrieves audio and license text only; it does not download
or execute upstream application code.
