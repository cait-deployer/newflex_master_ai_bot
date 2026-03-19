// app/api/n8n/route.ts
// Все вызовы n8n идут ТОЛЬКО через этот файл — браузер никогда не стучится в n8n напрямую
const N8N_URL = process.env.N8N_URL;

// Vercel serverless — каждый инстанс имеет свою очередь.
// При 50+ юзерах Vercel поднимает несколько инстансов автоматически,
// каждый держит до MAX_CONCURRENT параллельных запросов к n8n.
const MAX_CONCURRENT = 15; // сколько запросов к n8n одновременно на инстанс
const QUEUE_TIMEOUT = 20_000; // макс ожидание в очереди (мс)
const N8N_TIMEOUT = 55_000; // таймаут ответа n8n (меньше 60с лимита Vercel)
const MAX_RETRIES = 2;

class N8nQueue {
    private running = 0;
    private queue: Array<{ run: () => void; reject: (e: Error) => void; addedAt: number }> = [];

    async add<T>(fn: () => Promise<T>): Promise<T> {
        if (this.queue.length >= 50) {
            throw Object.assign(new Error('Queue full'), { status: 503 });
        }

        return new Promise<T>((resolve, reject) => {
            const addedAt = Date.now();

            const run = async () => {
                if (Date.now() - addedAt > QUEUE_TIMEOUT) {
                    reject(Object.assign(new Error('Queue timeout'), { status: 504 }));
                    this.running--;
                    this.tick();
                    return;
                }
                try {
                    resolve(await fn());
                } catch (e) {
                    reject(e);
                } finally {
                    this.running--;
                    this.tick();
                }
            };

            this.queue.push({ run, reject, addedAt });
            this.tick();
        });
    }

    private tick() {
        while (this.running < MAX_CONCURRENT && this.queue.length) {
            this.running++;
            const item = this.queue.shift()!;
            item.run();
        }
    }

    get stats() {
        return { running: this.running, queued: this.queue.length };
    }
}

const queue = new N8nQueue();

// Retry helper
async function fetchN8n(body: FormData, retries = MAX_RETRIES): Promise<Response> {
    for (let i = 0; i <= retries; i++) {
        try {
            const res = await fetch(N8N_URL!, {
                method: 'POST',
                body,
                signal: AbortSignal.timeout(N8N_TIMEOUT),
            });
            if (res.ok || res.status < 500) return res;
            if (i === retries) return res;
        } catch (err: any) {
            if (i === retries) throw err;
            await new Promise(r => setTimeout(r, 1000 * 2 ** i));
        }
    }
    throw new Error('unreachable');
}

export async function POST(req: Request) {
    try {
        const body = await req.formData();

        const result = await queue.add(() => fetchN8n(body));

        const text = await result.text();
        return new Response(text, {
            status: result.status,
            headers: { 'Content-Type': result.headers.get('Content-Type') ?? 'application/json' },
        });
    } catch (err: any) {
        const status = err.status ?? (err.name === 'TimeoutError' ? 504 : 500);
        const message =
            err.name === 'TimeoutError'
                ? 'Server took too long to respond. Please try again.'
                : status === 503
                  ? 'Server is busy right now — please wait a moment and try again.'
                  : status === 504
                    ? 'Request waited too long in queue. Please try again.'
                    : 'Server error. Please try again.';

        return Response.json({ error: message }, { status });
    }
}

export async function GET() {
    return Response.json({ ok: true, queue: queue.stats });
}
