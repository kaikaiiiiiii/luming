import React from 'react';
import { Form } from './Form';
import { Preview } from './Preview';

export function Content() {
  return (
    <section style={{

    }}>
      <div style="display:flex; flex-direction:column; gap:8px;">
      <Form />
      <Preview />
    </Div>
    </section>
  );
}
