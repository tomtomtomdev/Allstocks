# Four-Horn 360° Megaphone: Acoustic Systems Analysis

**Subject:** A megaphone/paging system using four directional horns mounted on a common
axis, splayed approximately 90° apart in azimuth, intended to deliver 360° coverage.

**Question:** Why can such a system be substantially less effective than "four horns,
four directions" suggests?

> **Status of the numbers in this document.** Every figure below is either (a) a standard
> textbook relation, or (b) an *illustrative* calculation from explicitly stated
> assumptions. Nothing here is an experimentally verified measurement of a specific
> product. Section 7 states the assumption set; Section 9 states what must be measured to
> replace estimates with data. Illustrative values are marked **[calc]**; standard
> relations are marked **[std]**.

---

## 1. The apparent advantage

The four-horn concept is attractive, and the reasons are real ones.

**Coverage.** Four horns at 90° intervals nominally tile the full horizontal circle. No
listener is behind the system. For a fixed installation on a pole, mast, or vehicle roof —
where there is no "front" — this removes the aiming problem entirely.

**Concentration of energy.** A horn is an acoustic transformer and a directivity device at
once. A representative re-entrant paging horn achieves on the order of 110 dB SPL at 1 W /
1 m on axis, against roughly 88–92 dB for a direct-radiating cone driver of similar size —
a 20 dB advantage in sensitivity. Part of that comes from genuine efficiency (better
impedance match to air), part from directivity (radiating into a restricted solid angle
instead of a sphere). Both are worth having.

**Directivity index.** For an illustrative horn with a nominal 60° × 40° pattern:

> Q ≈ 41253 / (θ_h × θ_v) = 41253 / (60 × 40) = **17.2**, i.e. DI ≈ **12.4 dB** **[calc]**

That 12.4 dB is the horn's real asset. It means the horn puts 17× the intensity on axis
that the same acoustic power would put anywhere if radiated omnidirectionally.

**Distribution of output.** Four horns share the thermal and excursion load. Each driver
runs at a quarter of the total power, which improves reliability, reduces power
compression, and reduces the distortion that a single hard-driven driver would produce.

**Apparent conclusion.** Four directional sources, each with 12.4 dB of directivity,
arranged to cover the whole circle: better than one omnidirectional source, and with four
times the hardware, presumably much louder.

The first three claims survive scrutiny. The fourth does not, and the first one — coverage —
survives only in a much weaker form than it appears.

---

## 2. First limitation: four horns are not four times the output

### 2.1 The category error: acoustic power vs. SPL at a point

Total radiated acoustic power and sound pressure level at a listener's position are
different quantities, and the four-horn intuition conflates them.

Adding horns increases **total radiated power**. It does not increase **SPL at any given
point**, because each additional horn radiates into a *different* solid angle. A listener
standing in front of horn #1 receives essentially all of their signal from horn #1. Horns
#2 and #4 are 90° off their own axes as seen from that listener; horn #3 is pointing away.
The power radiated by the other three horns is, from that listener's point of view, thrown
away.

Doubling power at a point requires **coherent summation at that point** — two sources
delivering comparable level, in phase, at the listener. That requires them to be aimed at
the same place. Four horns aimed 90° apart are, by construction, doing the opposite.

### 2.2 Amplifier power distribution: splitting costs 6 dB

With a fixed amplifier, splitting power N ways reduces the power available to each horn by
a factor N, and each horn's on-axis SPL by 10·log₁₀(N). **[std]**

Illustrative case: 110 dB/W/m horn sensitivity, 100 W total amplifier power. **[calc]**

| Configuration | Power per horn | On-axis SPL @ 1 m | Angular coverage |
|---|---|---|---|
| 100 W → 1 horn | 100 W | **130.0 dB** | ~60° |
| 100 W → 4 horns | 25 W | **124.0 dB** | ~240° (see §3) |
| 400 W → 4 horns (4 × 100 W) | 100 W | **130.0 dB** | ~240° |

The middle row is the design as usually built, and it is **6.0 dB quieter in every
direction** than the same amplifier driving a single horn. That is not a small number: 6 dB
is a halving of perceived loudness and a halving of usable range in free field.

The four-horn arrangement does not buy output. It **spends** output to buy angular
coverage, at a fixed exchange rate of 10·log₁₀(N) dB. To keep the level, you must also
quadruple the amplifier power (bottom row) — and even then no listener ever receives four
times anything.

### 2.3 The same trade seen as directivity

The exchange rate is visible a second way. Four horns each covering 60° × 40°, tiled with
no gaps and no overlap, form an array covering 240° × 40°:

| Radiator | Coverage | Q | DI |
|---|---|---|---|
| One 60° × 40° horn | 60° × 40° | 17.2 | **12.4 dB** |
| Four horns, tiled | 240° × 40° | 4.30 | **6.3 dB** |
| Hypothetical true 360° × 40° | 360° × 40° | 2.86 | **4.6 dB** |

**[calc]** Note that 17.2 / 4 = 4.30 exactly: the array's directivity is precisely the
single horn's divided by the number of directions. **Splaying horns converts directivity
into coverage, one-for-one.** The 6.1 dB of DI thrown away is the same 6.0 dB of SPL lost
in §2.2 — they are the same fact described twice.

This matters more than it first appears, because directivity is not merely about on-axis
level; it is what keeps a system out of the reverberant field (§5.3).

### 2.4 Losses in the electro-acoustic chain

Secondary, but they compound:

- **Impedance / load problems.** Four 8 Ω horns in parallel present 2 Ω. Most amplifiers
  cannot deliver rated power into 2 Ω; many current-limit, run hot, or protect. The usual
  fix — series-parallel wiring back to 8 Ω — delivers exactly P/4 per horn, i.e. the
  −6 dB of §2.2 with no way around it.
- **Line transformers.** On 70 V / 100 V distributed lines, each horn's transformer costs
  roughly 0.5–1.5 dB of insertion loss, and the tap setting fixes the power split. A
  frequent field error is four horns on identical taps when the four sectors have very
  different throw distances.
- **Thermal power compression.** Voice-coil heating raises DC resistance; under sustained
  high-level signal a compression driver typically loses 2–4 dB of sensitivity. Splitting
  power four ways actually *helps* here — the one genuine benefit of distribution.
- **Distortion.** A single horn driven at four times the power produces materially more
  harmonic and intermodulation distortion, which degrades intelligibility independently of
  level. Again, distribution helps.

### 2.5 Horn efficiency — and why it is not the problem

Working backwards from the illustrative sensitivity: 110 dB at 1 m implies p = 6.32 Pa,
I = p²/ρc = 0.097 W/m². With Q = 17.2, the acoustic power required is
I·4πr²/Q ≈ **0.071 W** from 1 W electrical — roughly **7% efficiency**. **[calc]**

Real horn-loaded compression drivers land somewhere in the 5–25% range depending on
bandwidth and loading. Compare with a direct radiator at 0.5–2%. **Efficiency is the
horn's strength, not its weakness.**

Keep this in proportion for later: halving horn efficiency costs 3 dB. Section 3 is about
to identify a 27 dB problem. Efficiency is not where this system fails.

**Verdict on limitation 1:** the system is not short of acoustic power. A 100 W four-horn
array producing 124 dB at 1 m per axis has ample power for most sites. The power
*accounting* is misunderstood — there is no 4× gain, there is a 6 dB loss per direction —
but raw output is rarely the binding constraint.

---

## 3. Escalation: what happens between the beams

This is where the design starts to fail in a way that cannot be fixed by turning it up.

### 3.1 The geometric requirement

Four horns at 90° spacing cover the circle uniformly **only if each horn's −6 dB
beamwidth is at least 90°.** That is the classical "−6 dB crossover" criterion: where two
adjacent sources are each 6 dB down, their incoherent sum is 3 dB down, giving ±3 dB of
ripple around the circle. **[std]**

The problem: **horn beamwidth is strongly frequency-dependent.** A re-entrant or
exponential horn is near-omnidirectional below the frequency at which its mouth becomes
acoustically large, and narrows steadily above it. It narrows *fastest exactly where speech
intelligibility lives.*

Illustrative beamwidths for a small paging horn: **[calc]**

| Octave band | Nominal −6 dB beamwidth | Horns needed at −6 dB crossover | Have |
|---|---|---|---|
| 500 Hz | 100° | 4 | 4 ✅ |
| 1 kHz | 90° | 4 | 4 ✅ |
| 2 kHz | 60° | 6 | 4 ❌ |
| 4 kHz | 40° | 9 | 4 ❌ |

The array is correctly configured at 500 Hz and 1 kHz. It is under-populated by 50% at
2 kHz and by more than 100% at 4 kHz. **A four-horn array at 90° spacing is a
correctly-designed system for the vowels and a badly-designed system for the consonants.**

### 3.2 Off-axis level around the circle

Modelling the main lobe as quadratic-in-dB, L(θ) = −6·(θ/θ₆ᵈᴮ)², summing the two nearest
horns incoherently (the far horns contribute < −24 dB and are negligible), with azimuth φ
measured from horn #1's axis and horn #2 at 90°: **[calc]**

| Band | φ = 0° | 15° | 22.5° | 30° | 45° (seam) | Ripple |
|---|---|---|---|---|---|---|
| 500 Hz | 0.0 | −0.3 | −0.8 | −1.3 | **−1.9** | 1.9 dB |
| 1 kHz | 0.0 | −0.6 | −1.2 | −2.0 | **−3.0** | 3.0 dB |
| 2 kHz | 0.0 | −1.5 | −3.4 | −5.9 | **−10.5** | 10.5 dB |
| 4 kHz | 0.0 | −3.4 | −7.6 | −13.5 | **−27.4** | 27.4 dB |

The 1 kHz row is the textbook −3 dB crossover: excellent. The 4 kHz row is a
**27 dB hole every 90°**.

### 3.3 Nominal 360° versus genuinely uniform 360°

The system does radiate into all 360°. Every azimuth receives sound. It is nonetheless not
a 360° system in any useful sense, and the gap between the two is best shown by what
different instruments report at the same seam position:

| Metric at the 45° seam | Value | Reading |
|---|---|---|
| Broadband, speech-weighted SPL | **−4.1 dB** | "acceptable, minor ripple" |
| 2 kHz octave | **−10.5 dB** | marginal |
| 4 kHz octave | **−27.4 dB** | failed |

**[calc]** (Speech-weighted broadband uses octave energy fractions 500 Hz 0.30, 1 kHz 0.35,
2 kHz 0.22, 4 kHz 0.13.)

**This is the single most important result in the analysis.** An SPL meter — even
A-weighted, which emphasises 500 Hz–2 kHz — reports the seam as roughly 4 dB down, which
any commissioning document would pass. The listener standing there hears speech whose
entire top two octaves have been removed. The fricatives and stops that carry consonant
identity — /s/, /ʃ/, /f/, /t/, /k/ — live at 2–6 kHz. At the seam they are gone.

**The coverage seam is not a level defect. It is a spectral defect that a level
measurement cannot see.** The system is loud and unintelligible at the same position, and
the loudness is what gets measured.

Two further consequences:

- **Coverage is frequency-dependent in shape, not just degree.** The system's effective
  pattern is a near-circle at 500 Hz, a rounded square at 1 kHz, a four-petal flower at
  2 kHz, and four searchlights at 4 kHz. There is no single polar plot that describes it.
- **Walking around the system produces timbral, not level, variation** — the sound gets
  duller and brighter rather than louder and quieter. Listeners describe this as
  "muffled in places", which is diagnosed as a power problem and treated by turning it up,
  which does nothing.

---

## 4. Escalation: acoustic interaction between the horns

The four horns are fed the same signal, so they are **coherent** sources. Where their
patterns overlap they interfere. The question is how much this actually matters — and the
honest answer is: less than §3, and only in specific places.

### 4.1 When interference can matter at all

Interference contrast depends entirely on how well-matched the two contributions are. For
two coherent signals differing by ΔL dB: **[std]**

| Level offset ΔL | Peak (constructive) | Null (destructive) | Peak-to-null ripple |
|---|---|---|---|
| 0 dB | +6.0 dB | −∞ (full cancellation) | unbounded |
| 3 dB | +4.7 dB | −10.7 dB | 15.3 dB |
| 6 dB | +3.5 dB | −6.0 dB | **9.6 dB** |
| 10 dB | +2.4 dB | −3.3 dB | **5.7 dB** |
| 15 dB | +1.4 dB | −1.7 dB | 3.1 dB |
| 20 dB | +0.8 dB | −0.9 dB | 1.7 dB |

**[calc]** Interference is only significant where two horns arrive within about 10 dB of
each other. Outside that window one horn dominates and the pattern is smooth.

That window is exactly the overlap region — which leads to the structural tension in the
whole design:

> **Narrow horns → small overlap regions → little interference, but large coverage gaps.
> Wide horns → smooth level coverage, but large overlap regions and hence combing.**
>
> Splaying horns does not let you escape this. You choose which artefact you get.

At 4 kHz with 40° beamwidths, the two horns are within 10 dB of each other only within
about ±8° of the bisector — so the 27 dB gap is *mostly a level gap, not an interference
null*. At 1 kHz with 90° beamwidths, the overlap is wide and interference genuinely shapes
the response. The two failure modes trade places with frequency.

### 4.2 Path differences and where the nulls fall

On the exact bisector between two adjacent horns, the two mouths are equidistant from the
listener: Δ = 0, the signals add in phase, and the result is **+6 dB relative to one
source** (coherent), not the +3 dB an incoherent estimate predicts. Coherent addition
*helps* precisely on the seam bisector.

Move off the bisector by angle φ and the path difference is Δ ≈ d·sin φ, where d is the
separation between adjacent horn mouths. For a compact head with mouth-centre radius
0.2 m, adjacent separation is d = 0.2·√2 ≈ 0.283 m. Nulls occur where Δ = λ/2, 3λ/2, …:
**[calc]**

| Band | λ | Nulls, degrees from bisector (d = 0.283 m) |
|---|---|---|
| 500 Hz | 68.6 cm | none (d < λ/2 — no null possible) |
| 1 kHz | 34.3 cm | ±37° |
| 2 kHz | 17.2 cm | ±18°, ±65° |
| 4 kHz | 8.6 cm | ±9°, ±27°, ±49° |

Below c/(2d) ≈ **606 Hz** no destructive null can exist anywhere: the sources are closer
together than half a wavelength and behave as one source. Above it, angular lobing appears
and multiplies with frequency. Wider spacing makes it worse: at d = 0.4 m the threshold
drops to 429 Hz.

So the array's real behaviour splits at roughly 600 Hz:

- **Below ~600 Hz:** the four horns are one source. They cannot be steered, they cannot
  interfere, and the four-horn geometry contributes nothing — every horn is radiating
  omnidirectionally and the array is simply an inefficient omni. (Four horns' worth of
  amplifier power is being spent to produce an omnidirectional low-frequency field.)
- **Above ~600 Hz:** pattern control and lobing both appear, and both sharpen with
  frequency.

### 4.3 Near field versus far field — and why the combing does not "average out"

Three distance regimes: **[std]**

1. **Single-horn near field** (roughly R < a few mouth dimensions, so R ≲ 1 m): the horn's
   own pattern is not yet formed. Irrelevant for listeners.
2. **Array near field** (R ≲ 2d²/λ; for d = 0.283 m at 4 kHz, ≈ **1.9 m**): the
   interference field varies with *both* angle and distance. Small head movements change
   the timbre. Only affects someone standing at the mast.
3. **Far field** (beyond that): the pattern stabilises into a **fixed function of angle**.

Point 3 is where a common misconception needs correcting. In the far field the interference
structure does **not** wash out with distance — it becomes distance-independent. A listener
at 50 m in a null direction is in the same null as a listener at 20 m in that direction.
Distance changes only the overall level, by 6 dB per doubling. **You cannot get far enough
away to escape the comb.**

### 4.4 How audible is it, really?

The perceptual weight of a comb depends on its *spacing in frequency*, which is set by the
path difference: Δf = c/Δ. **[calc]**

| Path difference | Comb spacing | Character |
|---|---|---|
| 0.05 m | 6860 Hz | broad spectral tilt |
| 0.1 m | 3430 Hz | broad spectral tilt |
| 0.3 m | 1143 Hz | broad dips — audible as tone colour |
| 1 m | 343 Hz | coarse comb, audible colouration |
| 3 m | 114 Hz | dense comb — "hollow", flanged |
| 10 m | 34 Hz | very dense — smears the signal |

The array's own path differences are ≤ ~0.3 m, giving comb spacings of 1 kHz and wider.
Features that broad are **wider than the ear's auditory filters** (roughly ⅓ octave), so
they are not heard as comb filtering at all — they are heard as **a change in tone colour**.
That is real and undesirable, but it is a few dB of frequency response, not a destroyed
signal.

**Conclusion on interference, kept in proportion:** inter-horn interference produces
angular lobing above ~600 Hz and a few dB of position-dependent tonal variation in the
overlap zones. It is a genuine effect, it is stable with distance, and it is *not* the
system's primary failure. It is worth perhaps 3–6 dB of ripple in restricted angular
regions, against §3's 27 dB spectral gap. Note especially that the dense, intelligibility-
destroying combs — the 3 m and 10 m rows above — require path differences the array itself
cannot produce. Those come from the environment.

---

## 5. The environment

Everything above assumed free field. Real sites are not free field, and the environment
attacks the array's *remaining* advantage.

### 5.1 Ground reflection: a sweeping comb in the speech band

A source at height h_s and an ear at h_r over reflective ground produce a two-path
interference pattern with Δ = √(R² + (h_s+h_r)²) − √(R² + (h_s−h_r)²). For h_s = 4 m
(typical pole) and h_r = 1.6 m: **[calc]**

| Distance R | Path difference Δ | 1st null | 2nd null |
|---|---|---|---|
| 10 m | 1.18 m | 146 Hz | 437 Hz |
| 20 m | 0.63 m | 274 Hz | 822 Hz |
| 30 m | 0.42 m | 406 Hz | 1218 Hz |
| 50 m | 0.26 m | 672 Hz | 2017 Hz |
| 100 m | 0.13 m | 1341 Hz | 4023 Hz |

Two things to notice. The nulls sit **inside the speech band**, and they **sweep with
distance** — so this comb cannot be equalised out, because the correction needed at 30 m
is wrong at 50 m. Over hard ground (asphalt, water, concrete) the nulls are deep; over
grass or soil, ground absorption softens them but adds its own excess attenuation at
250–1000 Hz.

### 5.2 Discrete reflections from buildings and hard surfaces

A facade 20 m behind the listener adds a path of up to 40 m — about **117 ms** of delay.
Speech integrates reflections usefully only within roughly the first **50 ms** (the C50 /
early-late boundary); beyond that a reflection within ~10 dB of the direct sound is heard
as a **discrete echo** and smears syllables directly. **[std]**

A 360° system is uniquely exposed here. An aimed horn can be pointed *away* from a
reflective facade. A four-horn array radiates a full quarter of its power straight into
every wall, ceiling, and building around it, by design. **The 360° pattern is not merely
neutral toward reflective surfaces — it actively feeds them.**

### 5.3 Reverberation: high SPL, low intelligibility

This is the mechanism by which the array can measure well and perform badly.

Illustrative enclosed space (station concourse / large hall): V = 20,000 m³,
S = 6,000 m², mean α = 0.15.

> Room constant R = Sα/(1−α) = **1059 m²**; RT₆₀ = 0.161V/(Sα) = **3.6 s** **[std]**
>
> Critical distance D_c = 0.141·√(Q·R) **[std]**

| Radiator | Q | D_c | 3.16·D_c |
|---|---|---|---|
| Single aimed 60° × 40° horn | 17.2 | **19.0 m** | 60 m |
| Four-horn array | 4.30 | **9.5 m** | 30 m |

**[calc]** The array's critical distance is **exactly half** the single horn's — the
√4 that follows directly from the DI given away in §2.3. Beyond D_c the reverberant field
dominates: SPL stops falling (it plateaus at the reverberant level) while the
direct-to-reverberant ratio keeps degrading. **The meter stays high; the intelligibility
does not.**

Peutz articulation loss of consonants, %AL_cons ≈ 200·r²·RT²/(V·Q), limited to 9·RT₆₀ for
r ≥ 3.16·D_c: **[std]**

| Listener distance | Single aimed horn | Four-horn array |
|---|---|---|
| 10 m | 0.7% (excellent) | 3.0% (good) |
| 30 m | **6.7%** (acceptable) | **26.8%** (unusable) |
| 60 m | 26.8% (unusable) | **32.2%** — RT-limited |

**[calc]** Interpretation scale: < 5% excellent, 5–10% good, 10–15% poor, > 15%
unacceptable for emergency speech.

At 30 m, same total amplifier power, same drivers, same distance: **6.7% versus 26.8%.**
The only difference is directivity. This single comparison is the strongest quantitative
statement in the analysis: the four-horn arrangement's coverage is bought with the very
property that makes speech survive a reverberant room.

And note the last row. Beyond 3.16·D_c the loss **saturates at 9·RT₆₀ = 32.2%** and stops
depending on distance, on Q, or on level entirely. In that regime:

> **Turning the amplifier up cannot improve intelligibility. It raises the direct and the
> reverberant field by the same amount, leaving D/R unchanged. More power makes the
> unintelligible sound louder.**

### 5.4 Outdoors versus indoors

| | Outdoor, open | Outdoor, built-up | Indoor, reverberant |
|---|---|---|---|
| Dominant limit | inverse-square + ambient noise | discrete echoes, 50–150 ms | D/R ratio, RT₆₀ |
| Does more power help? | yes, 6 dB per doubling of range | no — echo scales with direct | no — D/R invariant |
| Does the 360° pattern hurt? | mildly (wasted power) | strongly (feeds every facade) | severely (halves D_c) |
| Four-horn seam visible as | dull spots at 45° | masked by reflections, still dull | masked by reverberation |
| Best remedy | more Q, aimed | aim away from surfaces; distribute | high vertical Q; distribute |

Also relevant outdoors: **air absorption** is frequency-selective and attacks the same band
the seams do — roughly 8.5 dB/km at 4 kHz and ~30 dB/km at 8 kHz at 20 °C / 50% RH, so
about 0.9 dB at 100 m at 4 kHz. Small next to the 27 dB seam, but it is another debit
against the consonant band, and wind and temperature gradients add refractive shadow zones
that no amount of horn design addresses.

---

## 6. Theory versus reality

### 6.1 The two causal chains

**Theoretical chain:**
> 4 horns → 4 directions → 360° coverage → 4× hardware → seemingly high, uniform output

**Actual chain:**
> 4 horns → fixed amplifier power split 4 ways (**−6 dB per direction**)
> → directivity index divided by 4 (**−6.1 dB DI**)
> → beamwidth narrows with frequency, so 90° spacing under-covers above ~1.5 kHz
> → **spectral seams every 90°: −4 dB broadband but −27 dB at 4 kHz**
> → coherent lobing in the overlap zones above ~600 Hz (a few dB, localised)
> → a quarter of the power radiated into every reflective surface by design
> → **critical distance halved**, so the reverberant field dominates twice as close
> → high measured SPL, collapsed consonant articulation

### 6.2 Ranking the causes

| # | Candidate limitation | Magnitude | Verdict |
|---|---|---|---|
| 1 | Insufficient acoustic power | −6 dB vs. undivided amp | **Not primary.** Real, but it is a mis-accounting, not a shortage. 124 dB @ 1 m is ample for most sites. Answerable with more amplifier power. |
| 2 | Poor beam coverage / non-uniformity | −4 dB broadband, **−27 dB at 4 kHz** | **Primary.** Largest single number in the analysis, frequency-selective in the consonant band, and invisible to SPL measurement. Not answerable with more power. |
| 3 | Overlap / interference | 3–6 dB ripple, localised, above ~600 Hz | **Secondary.** Genuine, stable with distance, but an order of magnitude smaller than (2) and confined to the overlap zones. |
| 4 | Reflections / reverberation | D_c halved; %AL_cons 6.7% → 26.8% at 30 m | **Co-primary in enclosed or built-up sites.** Caused *by* the loss of Q in (2)/§2.3, and it saturates — beyond 3.16·D_c no amount of level helps. |
| 5 | Horn efficiency | ~7%; a halving costs 3 dB | **Not a limitation.** Efficiency is the horn's asset. |

**The answer is a combination, but not an equal one, and the parts are not independent.**

The root cause is **(2) coverage non-uniformity, driven by the frequency-dependence of horn
directivity**, with **(4) reverberation as its amplifier in real rooms**. Both descend from
the same act: splaying the horns spends the array's directivity on angular coverage. That
single decision produces the seams (because the coverage bought is frequency-dependent and
under-delivered at high frequency) *and* the reverberation vulnerability (because the Q
given up is what would have kept the direct field dominant).

Items (1), (3), and (5) are real but secondary — and importantly, (1) and (5) are the two
the intuitive analysis focuses on, which is why the failure is usually misdiagnosed as
"needs more power."

---

## 7. Quantified worked example

### 7.1 Assumption set (all illustrative)

| Parameter | Value |
|---|---|
| Number of horns | 4, at 90° azimuth spacing |
| Horn sensitivity | 110 dB SPL @ 1 W / 1 m, on axis |
| Total amplifier power | 100 W, split evenly → 25 W per horn |
| On-axis SPL @ 1 m per horn | 110 + 10·log₁₀(25) = **124.0 dB** |
| Nominal pattern | 60° × 40° (−6 dB) at 2 kHz |
| −6 dB beamwidth by band | 100° / 90° / 60° / 40° at 0.5 / 1 / 2 / 4 kHz |
| Mouth-centre radius | 0.2 m → adjacent mouth separation d = 0.283 m |
| Mounting height | 4 m; ear height 1.6 m |
| Polar model | L(θ) = −6·(θ/θ₆ᵈᴮ)², main lobe only, no sidelobes |
| Summation | incoherent (power) sum of the three nearest horns |
| Propagation | free field, inverse-square, no air absorption unless noted |

> **Model limitations, stated plainly.** The quadratic-in-dB polar is a reasonable main-lobe
> approximation but models no sidelobes, no rear radiation, and no cabinet diffraction, so
> it *overstates* the depth of the 4 kHz seam — a real horn's sidelobes and enclosure
> scattering would partially fill it, and a realistic figure is likely 12–20 dB rather than
> 27 dB. Incoherent summation is the right choice for a *band-averaged* estimate but
> deliberately ignores the coherent structure of §4, which redistributes energy within the
> overlap without changing the band average much. **The direction and order of magnitude of
> every conclusion is robust; the individual decibel values are not measurements.**

### 7.2 SPL versus azimuth and distance

Speech-weighted broadband offsets from the polar model: 0° → 0.0 dB, 22.5° → −2.0 dB,
45° → −4.1 dB. **[calc]**

| Distance | On axis (0°) | 22.5° | 45° seam (broadband) | 45° seam, 4 kHz octave |
|---|---|---|---|---|
| 1 m | 124.0 | 122.0 | 119.9 | 87.8 |
| 2 m | 118.0 | 116.0 | 113.9 | 81.7 |
| 5 m | 110.0 | 108.1 | 105.9 | 73.8 |
| 10 m | 104.0 | 102.0 | 99.9 | 67.8 |
| 20 m | 98.0 | 96.0 | 93.9 | 61.7 |
| 30 m | 94.5 | 92.5 | 90.4 | 58.2 |
| 50 m | 90.0 | 88.1 | 85.9 | 53.8 |
| 100 m | 84.0 | 82.0 | 79.9 | 47.8 |

The broadband columns look benign: a 4 dB spread around the circle at any distance, which
would pass most specifications. The last column is where the system fails.

### 7.3 Signal-to-noise per band — the intelligibility view

Listener at 30 m in 65 dB(A) urban ambient noise (illustrative octave-band noise: 58 / 56 /
53 / 48 dB at 0.5 / 1 / 2 / 4 kHz). Band levels derived from the broadband SPL and the
speech energy fractions: **[calc]**

| Band | On-axis SPL | On-axis SNR | Seam SPL | Seam SNR | SNR lost |
|---|---|---|---|---|---|
| 500 Hz | 89.3 | +31 dB | 87.4 | +29 dB | 2 dB |
| 1 kHz | 90.0 | +34 dB | 87.0 | +31 dB | 3 dB |
| 2 kHz | 87.9 | +35 dB | 77.4 | +24 dB | 11 dB |
| 4 kHz | 85.6 | +38 dB | 58.2 | **+10 dB** | **28 dB** |

On axis the spectrum is balanced and every band has 30+ dB of headroom over the noise. At
the seam, the low bands are essentially untouched while 4 kHz has lost 28 dB of margin —
enough that any reverberation, air absorption, or ambient noise transient pushes it under.
The listener has plenty of level and no consonants.

### 7.4 Adding the room

Same array in the §5.3 concourse (RT₆₀ = 3.6 s, D_c = 9.5 m): **[calc]**

| Listener | Free-field SPL | In-room SPL | D/R | %AL_cons |
|---|---|---|---|---|
| 10 m, on axis | 104.0 | ≈ 107 (reverberant contribution) | −0.4 dB | 3.0% |
| 30 m, on axis | 94.5 | ≈ 101 (reverberant plateau) | −10.0 dB | 26.8% |
| 30 m, at seam | 90.4 | ≈ 100 (reverberation fills the seam) | −10.0 dB | > 27% |

Note the pathology in the last row. Reverberation **hides** the seam on the meter — the
reverberant field is diffuse, so it fills the level gap and the measured SPL at the seam
looks almost normal. It does not restore the consonants; it replaces missing direct
high-frequency energy with time-smeared reverberant energy, which is worse than silence in
that band. The measurement improves while the listening experience degrades.

---

## 8. Conclusion

### Why a four-horn 360° megaphone can be substantially less effective than its configuration suggests

**Because splaying four horns spends the horns' only real asset — directivity — on angular
coverage, and then delivers that coverage non-uniformly across frequency, in an environment
that punishes the loss of directivity a second time.**

Unpacked into the four claims that matter:

1. **Four horns produce no extra level anywhere.** With a fixed amplifier they cost
   10·log₁₀(4) = **6 dB in every direction**, because SPL at a point is set by the one or
   two horns aimed at that point, not by total radiated power. Coverage and level trade
   against each other at a fixed exchange rate, and this design pays full price.

2. **The coverage it buys is frequency-dependent, and it under-delivers exactly where
   speech intelligibility lives.** 90° spacing needs ≥ 90° beamwidth. Real horns provide
   that at 1 kHz and about 40° at 4 kHz. The seams every 90° are therefore not level dips
   but **low-pass filters**: about −4 dB broadband and −27 dB at 4 kHz in the illustrative
   case (realistically −12 to −20 dB with sidelobe fill).

3. **The dominant failure is invisible to the dominant measurement.** A broadband or
   A-weighted SPL survey reports the seams as a few dB of ripple and passes the system.
   Only band-resolved SPL or an STI/STIPA measurement reveals the defect. This is why the
   symptom is reported as "muffled in places" and treated as a power problem, and why
   adding power never fixes it.

4. **Reverberation converts the sacrificed directivity into an intelligibility failure, and
   then saturates.** Quartering Q halves the critical distance, so the reverberant field
   dominates from half the distance. Illustratively, %AL_cons at 30 m goes from 6.7% (one
   aimed horn) to 26.8% (four-horn array) with identical hardware and power. Beyond
   3.16·D_c, articulation loss depends only on RT₆₀ — turning it up raises direct and
   reverberant sound equally, so **there is a regime in which no amount of amplifier power
   can improve intelligibility at all.** Worse, reverberation *masks* the seams on the
   meter while leaving them audible.

Inter-horn interference (a few dB of angular lobing above ~600 Hz, confined to the overlap
zones) and horn efficiency (~7%, the design's strength) are real but secondary. They are
also the two things the intuitive analysis worries about — which is precisely why the real
failure gets misdiagnosed.

**The compact irony:** below about 600 Hz the four horns are acoustically one source and the
splayed geometry buys nothing at all; above about 1.5 kHz the geometry is under-populated
and the coverage breaks into petals. The four-horn arrangement is well-matched to the
frequency band around 1 kHz, and only that band — roughly one octave of a five-octave
speech signal.

---

### Design changes, ranked by benefit per unit of effort

**Tier 1 — largest improvement, addresses the root cause**

1. **Match beamwidth to spacing at the highest frequency that matters, not the lowest.**
   This is the whole game. Either specify constant-directivity horns that hold a nominal
   90° horizontal pattern out to 6–8 kHz (CD/waveguide geometry rather than plain
   exponential or re-entrant flares), or increase the horn count so spacing matches the
   *high-frequency* beamwidth: 6 horns at 60° for a 2 kHz-limited horn, ~9 at 40° for a
   4 kHz-limited one. Expected gain at the seam: the entire 10–27 dB high-frequency
   deficit.

2. **Question whether 360° is actually required.** It usually is not — some sectors face
   water, fields, a hillside, or a building. Serving 180° with two horns instead of 360°
   with four returns **+3 dB of level and +3 dB of DI** for free, halves the number of
   seams, and stops radiating into two reflective quadrants. Trading unused coverage back
   for level and Q is the cheapest available gain in the entire system.

3. **Split by frequency band instead of by mechanical splay.** Below ~600–800 Hz the horns
   are omnidirectional and interfering with each other to no purpose; above it they need
   pattern control. Build the system as a single low-frequency section (near-omni anyway,
   so use one, at full power, with the excursion budget concentrated) crossed over at
   800 Hz–1.2 kHz to pattern-controlled high-frequency devices. This removes the
   low-frequency lobing of §4.2, stops spending four amplifier channels to make one omni
   field, and lets each section be optimised for what it can actually do.

**Tier 2 — significant, moderate cost**

4. **Individual amplification and per-horn DSP.** One channel per horn eliminates the 2 Ω
   load problem, and — more importantly — permits per-sector level shading for different
   throw distances, per-sector high-frequency shelving to compensate air absorption and
   long throws, and per-sector muting of unused directions.

5. **Crossover and EQ for the speech band specifically.** Band-limit to ~250 Hz–5 kHz: below
   250 Hz the horn cannot load anyway and the energy only feeds reverberation; a 3–6 dB
   presence lift at 2–4 kHz directly buys consonant articulation. Add gentle compression
   (6–10 dB) with peak limiting to raise the *average* level without clipping, plus
   ambient-noise-sensing gain. **In most reverberant or noisy sites, speech-band shaping
   buys more STI than another 3 dB of raw SPL** — and unlike raw SPL, it still works beyond
   the critical distance.

6. **Orientation and geometry.** Down-tilt 10–20° so the main lobe intersects the listener
   plane at the design distance rather than overshooting into facades; keep the array off
   flush wall mounts; align all four horns to a common acoustic origin so overlap-zone path
   differences shrink (this is the one change that genuinely reduces §4's lobing). Staggering
   heights slightly decorrelates the seams across the vertical plane.

**Tier 3 — real but limited for a compact array**

7. **Delay / phase optimisation.** With all four mouths inside a ~0.3 m circle, per-horn
   delay can *shift* the interference structure and align acoustic centres, but it cannot
   remove a level gap: a seam caused by insufficient beamwidth is not a phase problem, and
   no delay setting creates high-frequency energy that no horn is radiating in that
   direction. Useful for fine-tuning overlap and beam tilt; not a fix for §3.

8. **Sequential sector firing** (round-robin at full power, one sector at a time) gives
   +6 dB per sector during its slot with zero interference. Genuinely useful for **sirens
   and tone alerts** — this is effectively a rotating-beam siren — but it fragments live
   speech and must not be used for announcements.

**Tier 4 — replace the architecture**

If the requirement is genuinely uniform 360° speech coverage, the splayed-horn topology is
the wrong tool, and these are better answers:

9. **Vertical line array / column loudspeaker.** Inherently omnidirectional in azimuth
   (**no seams, no inter-source interference in the horizontal plane at all**) while
   concentrating directivity in the *vertical* plane. This is the architecturally correct
   answer, because it puts the Q exactly where it is useful: vertical directivity suppresses
   ground and ceiling reflections and raises D_c, while the horizontal plane — where the
   listeners are — is served uniformly. It solves §3, §4, and §5 simultaneously, which no
   amount of horn re-splaying can.

10. **Toroidal / radial ("donut") horn.** A single driver into a circumferential 360° flare.
    True seamless 360°, one coherent source, no inter-source interference. Directivity is
    limited to the vertical plane and it cannot match a line array's vertical Q, but it is
    compact and a large improvement on four splayed horns.

11. **Distributed system.** Several lower-power units placed near their listeners instead of
    one high-power array at the centre. Halving the source-to-listener distance is worth
    6 dB, and — decisively — every listener sits closer to *some* source than to the
    reverberant field, so D/R improves everywhere at once. **In reverberant or built-up
    sites this beats any single-point architecture, including a perfect one.** Costs cabling
    and delay zoning; buys the one thing a central array structurally cannot.

12. **Steerable / beam-forming column** for difficult indoor sites, where the vertical beam
    can be aimed at the audience plane and away from hard surfaces electronically.

---

## 9. Verifying this analysis against measurement

Everything above is analytical. To replace the estimates with data:

| Quantity | Method |
|---|---|
| Real horn polars | Manufacturer 1/3-octave polar data, or anechoic/ground-plane measurement per IEC 60268-5. Look specifically at the **2 kHz–8 kHz** beamwidths — that is where the design lives or dies. |
| Actual coverage uniformity | Octave-band SPL mapped at listener height every 15° around the full circle at 2–3 distances. **Band-resolved, not broadband** — broadband will not show the defect. |
| Intelligibility | **STIPA per IEC 60268-16** at on-axis, 22.5°, and 45° seam positions. For voice-alarm duty, ISO 7240-19 / EN 54-16 require STI ≥ 0.5 (CIS ≥ 0.7). Expect the seam positions to fail while broadband SPL passes. |
| D/R, C50, RT₆₀ | Impulse-response measurement (swept sine) at representative listener positions. |
| Interference structure | Fine angular resolution (2–5°) narrowband sweeps through the overlap zones at 1, 2 and 4 kHz, at ≥ 2 distances, to confirm the far-field lobing is distance-invariant as §4.3 predicts. |

**The single most diagnostic test:** measure broadband SPL and 4 kHz octave-band SPL at the
same set of positions around the circle, and plot both. The predicted signature of this
failure mode is a **flat broadband curve over a deeply scalloped high-frequency curve.**
If that is what the data shows, the problem is beam coverage, not power — and no amplifier
will fix it.
