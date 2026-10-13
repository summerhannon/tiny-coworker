/**
 * Smooth-vector buddy. viewBox 200×180; mouth at (100, 115); head top at y=64.
 * Each moving part = pose group (transition) > loop group (keyframes).
 * Arms are two-joint rigs (shoulder > elbow); the mug rides in the right hand.
 * Rest geometry = right hand on the mug handle; each state rotates the joints.
 */
export const BUDDY_SVG = `
<svg class="buddy-svg" viewBox="0 0 200 180" data-state="idle" data-paused="false" data-big="false" data-laptop="false" aria-hidden="true" focusable="false">
  <ellipse class="b-shadow" cx="100" cy="166" rx="50" ry="6" fill="var(--b-shadow)"/>
  <g class="b-body-pose b-move"><g class="b-body-loop">
    <rect x="60" y="64" width="80" height="96" rx="40" fill="var(--b-body)"/>
    <ellipse cx="100" cy="136" rx="24" ry="17" fill="var(--b-belly)"/>
    <g class="b-larm-pose b-move"><g class="b-larm-loop">
      <path d="M64 118 L52.6 133.2" stroke="var(--b-arm)" stroke-width="9" fill="none" stroke-linecap="round"/>
      <g class="b-lfore-pose b-move"><g class="b-lfore-loop">
        <path d="M52.6 133.2 L46 151" stroke="var(--b-arm)" stroke-width="9" fill="none" stroke-linecap="round"/>
      </g></g>
    </g></g>
    <g class="b-face b-move">
      <g class="b-eyes-read"><g class="b-eyes-open b-move">
        <ellipse cx="86" cy="100" rx="4.5" ry="6" fill="var(--b-ink)"/>
        <ellipse cx="114" cy="100" rx="4.5" ry="6" fill="var(--b-ink)"/>
      </g></g>
      <path class="b-eyes-closed b-move" d="M81 101 q5 4 10 0 M109 101 q5 4 10 0" stroke="var(--b-ink)" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <circle cx="77" cy="112" r="6" fill="var(--b-cheek)" opacity=".7"/>
      <circle cx="123" cy="112" r="6" fill="var(--b-cheek)" opacity=".7"/>
      <path class="b-mouth" d="M94 113 Q100 119 106 113" stroke="var(--b-ink)" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    </g>
    <g class="b-rarm-pose b-move"><g class="b-rarm-loop">
      <path d="M136 118 L147.4 133.2" stroke="var(--b-arm)" stroke-width="9" fill="none" stroke-linecap="round"/>
      <g class="b-rfore-pose b-move"><g class="b-rfore-loop">
        <path d="M147.4 133.2 L154 151" stroke="var(--b-arm)" stroke-width="9" fill="none" stroke-linecap="round"/>
        <g class="b-mug-pose b-move"><g class="b-mug-loop">
          <rect x="132" y="140" width="18" height="20" rx="4" fill="var(--b-mug)"/>
          <path d="M150 145 q7 0 7 6 q0 6 -7 6" stroke="var(--b-mug-dark)" stroke-width="3" fill="none"/>
          <path class="b-steam" d="M137 135 q-3 -5 0 -10 M144 135 q3 -5 0 -10" stroke="var(--b-steam)" stroke-width="2" fill="none" stroke-linecap="round"/>
        </g></g>
      </g></g>
    </g></g>
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
