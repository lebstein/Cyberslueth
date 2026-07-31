/* Tweaks panel for the Cyber Sleuth live deck */
const { useState, useEffect } = React;

function CyberTweaks() {
  const [t, setTweak] = useTweaks(window.CYBER_TWEAKS);
  const [session, setSession] = useState(window.SLEUTH_SESSION || '—');

  useEffect(() => {
    if (window.applyCyberTweaks) window.applyCyberTweaks(t);
  }, [t]);

  return (
    <TweaksPanel title="Live session">
      <TweakSection label="Session">
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'6px 0'}}>
          <span style={{fontSize:12, color:'#aaa'}}>Session code</span>
          <span style={{fontFamily:'monospace', fontSize:18, fontWeight:700, color:'#deac27', letterSpacing:'0.15em'}}>{session}</span>
        </div>
        <TweakButton label="Start new session (clears players)" onClick={() => {
          if (window.sleuthNewSession) setSession(window.sleuthNewSession());
        }} />
        <div style={{fontSize:11, color:'#888', lineHeight:1.4, marginTop:4}}>
          New code = fresh room. Phones on the old code stop receiving updates.
        </div>
      </TweakSection>
      <TweakSection label="Quiz link">
        <TweakText label="Deployed quiz URL" placeholder="https://you.github.io/repo/quiz.html"
          value={t.quizBase} onChange={(v) => setTweak('quizBase', v)} />
        <div style={{fontSize:11, color:'#888', lineHeight:1.4, marginTop:4}}>
          Paste your GitHub Pages URL for quiz.html — the join QR re-renders instantly. Leave blank to use a local relative link.
        </div>
      </TweakSection>
      <TweakSection label="Timing">
        <TweakSlider label="Seconds per question" value={t.timerSeconds} min={10} max={90} step={5}
          onChange={(v) => setTweak('timerSeconds', v)} />
      </TweakSection>
    </TweaksPanel>
  );
}

const tweaksRoot = document.createElement('div');
tweaksRoot.id = 'tweaks-mount';
document.body.appendChild(tweaksRoot);
ReactDOM.createRoot(tweaksRoot).render(<CyberTweaks />);
