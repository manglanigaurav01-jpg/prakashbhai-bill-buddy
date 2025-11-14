import { utils, write } from 'xlsx';

type MessageIn = { type: 'export-xlsx'; workbook: any; fileName: string };
type MessageOut = { type: 'export-xlsx-result'; fileName: string; buffer: ArrayBuffer } | { type: 'error'; message: string };

self.addEventListener('message', async (ev: MessageEvent<MessageIn>) => {
  const msg = ev.data;
  try {
    if (msg.type === 'export-xlsx') {
      const workbook = msg.workbook;
      // write workbook to array
      const excelBuffer = write(workbook, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
      ;(self as any).postMessage({ type: 'export-xlsx-result', fileName: msg.fileName, buffer: excelBuffer }, [excelBuffer]);
    }
  } catch (err: any) {
    ;(self as any).postMessage({ type: 'error', message: err?.message || String(err) });
  }
});

export {};
