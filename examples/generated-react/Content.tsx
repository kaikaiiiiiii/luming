import React from 'react';
import { MyForm } from './MyForm';
import { Preview } from './Preview';

export function Content() {
  return (
    <section style={{

    }}>
      <div style="display:flex; flex-direction:column; gap:8px;">
      <MyForm />
      <Preview />
    </div>
    </section>
  );
}
