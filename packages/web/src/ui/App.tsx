import React, { useEffect, useState } from 'react';
import { ArtworkModal } from './ArtworkModal';

export default function App(){
  const [health, setHealth] = useState<string>('checking...');
  const [artOpen, setArtOpen] = useState(false);
  const [title, setTitle] = useState('Attack on Titan');

  useEffect(() => {
    fetch('/api/system/health').then(r=>r.json()).then(() => setHealth('ok')).catch(()=>setHealth('down'));
  }, []);

  return (
    <div style={{fontFamily:'Inter, system-ui, sans-serif', color:'#e5e7eb', background:'#0b0f16', minHeight:'100vh'}}>
      <div style={{padding:'14px', borderBottom:'1px solid #1f2937', background:'#0f172a', position:'sticky', top:0}}>MediaOS <span style={{fontSize:12, color:'#9aa4b2'}}>health: {health}</span></div>
      <div style={{maxWidth:960, margin:'18px auto', padding:'0 16px'}}>
        <h2>Demo</h2>
        <p>Click below to open the Artwork Manager modal (lock/revert + tabs).</p>
        <button onClick={()=>setArtOpen(true)} style={{padding:'8px 10px', borderRadius:8, border:'1px solid #1f2937', background:'#0b1220', color:'#e5e7eb'}}>Open Artwork for {title}</button>
      </div>
      <ArtworkModal open={artOpen} onClose={()=>setArtOpen(false)} title={title} />
    </div>
  )
}
