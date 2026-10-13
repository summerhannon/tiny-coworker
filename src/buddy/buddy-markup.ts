/**
 * Smooth-vector buddy. viewBox 200×180; mouth at (100, 115); head top at y=64.
 * Each moving part = pose group (transition) > loop group (keyframes).
 * Arms are invisible two-joint rigs (shoulder > elbow > hand markers); the mug rides in
 * the right hand. Rest geometry = right hand on the mug handle; each state rotates the
 * joints. SvgBuddy draws each visible arm as one smooth curve through the markers, in a
 * back layer (behind the body) or front layer (over it) depending on the state.
 */
export const BUDDY_SVG = `
<svg class="buddy-svg" viewBox="0 0 200 180" data-state="idle" data-paused="false" data-big="false" data-laptop="false" data-activity="coffee" aria-hidden="true" focusable="false">
  <ellipse class="b-shadow" cx="100" cy="166" rx="50" ry="6" fill="var(--b-shadow)"/>
  <g class="b-body-pose b-move"><g class="b-body-loop">
    <g class="b-arms-back">
      <path class="b-arm b-arm-l" d="M64 118 Q50.5 134.4 59 154"/>
      <path class="b-arm b-arm-r" d="M136 118 Q149.5 134.4 141 154"/>
    </g>
    <rect x="60" y="64" width="80" height="96" rx="40" fill="var(--b-body)"/>
    <ellipse cx="100" cy="136" rx="24" ry="17" fill="var(--b-belly)"/>
    <g class="b-face b-move">
      <g class="b-eyes-read"><g class="b-eyes-open b-move">
        <ellipse cx="86" cy="100" rx="4.5" ry="6" fill="var(--b-ink)"/>
        <ellipse cx="114" cy="100" rx="4.5" ry="6" fill="var(--b-ink)"/>
      </g></g>
      <path class="b-eyes-happy" d="M81 102 q5 -6 10 0 M109 102 q5 -6 10 0" stroke="var(--b-ink)" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <path class="b-eyes-closed b-move" d="M81 101 q5 4 10 0 M109 101 q5 4 10 0" stroke="var(--b-ink)" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <circle class="b-cheek" cx="77" cy="112" r="6" fill="var(--b-cheek)"/>
      <circle class="b-cheek" cx="123" cy="112" r="6" fill="var(--b-cheek)"/>
      <path class="b-mouth" d="M94 113 Q100 119 106 113" stroke="var(--b-ink)" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <path class="b-mouth-open" d="M93 112 Q100 123 107 112 Z" fill="var(--b-ink)" stroke="var(--b-ink)" stroke-width="1.5" stroke-linejoin="round"/>
      <circle class="b-mouth-o" cx="100" cy="116" r="3.5" stroke="var(--b-ink)" stroke-width="2.5" fill="none"/>
    </g>
    <g class="b-headphones b-move">
      <path d="M63 98 Q63 54 100 54 Q137 54 137 98" stroke="var(--b-gear)" stroke-width="5" fill="none" stroke-linecap="round"/>
      <rect x="55" y="88" width="13" height="22" rx="6" fill="var(--b-gear)"/>
      <rect x="132" y="88" width="13" height="22" rx="6" fill="var(--b-gear)"/>
    </g>
    <g class="b-arms-front">
      <path class="b-arm b-arm-l" d="M64 118 Q50.5 134.4 59 154"/>
      <path class="b-arm b-arm-r" d="M136 118 Q149.5 134.4 141 154"/>
    </g>
    <g class="b-larm-pose b-move"><g class="b-larm-loop">
      <circle class="b-joint" data-joint="l-elbow" cx="52.6" cy="133.2" r="0"/>
      <g class="b-lfore-pose b-move"><g class="b-lfore-loop">
        <circle class="b-joint" data-joint="l-hand" cx="46" cy="151" r="0"/>
      </g></g>
    </g></g>
    <g class="b-rarm-pose b-move"><g class="b-rarm-loop">
      <circle class="b-joint" data-joint="r-elbow" cx="147.4" cy="133.2" r="0"/>
      <g class="b-rfore-pose b-move"><g class="b-rfore-loop">
        <circle class="b-joint" data-joint="r-hand" cx="154" cy="151" r="0"/>
        <g class="b-mug-pose b-move"><g class="b-mug-loop">
          <rect x="132" y="140" width="18" height="20" rx="4" fill="var(--b-mug)"/>
          <path d="M150 145 q7 0 7 6 q0 6 -7 6" stroke="var(--b-mug-dark)" stroke-width="3" fill="none"/>
          <path class="b-steam" d="M137 135 q-3 -5 0 -10 M144 135 q3 -5 0 -10" stroke="var(--b-steam)" stroke-width="2" fill="none" stroke-linecap="round"/>
        </g></g>
      </g></g>
    </g></g>
    <g class="b-notes">
      <text class="b-note" x="148" y="70">♪</text>
      <text class="b-note" x="158" y="58">♫</text>
      <text class="b-note" x="40" y="72">♪</text>
    </g>
    <g class="b-zzz b-move">
      <text class="b-z" x="132" y="62">z</text>
      <text class="b-z" x="142" y="50">z</text>
      <text class="b-z" x="152" y="38">z</text>
    </g>
  </g></g>
  <g class="b-laptop b-move">
    <rect x="66" y="124" width="68" height="36" rx="5" fill="var(--b-lid)"/>
    <circle cx="100" cy="142" r="4" fill="var(--b-logo)"/>
    <rect x="54" y="158" width="92" height="7" rx="3.5" fill="var(--b-base)"/>
  </g>
</svg>`;
