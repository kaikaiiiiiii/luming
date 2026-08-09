import React from 'react';
import { Tabs } from './Tabs';
import { Content } from './Content';

export function MyMain() {
  return (
    <section style={{
    "background-color": "#fda",
    "width": "70%"
    }}>
      <div style="display:flex; flex-direction:column; gap:8px;">
      <Tabs />
      <Content />
    </div>
    </section>
  );
}
