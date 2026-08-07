import { queueClientMessageAction } from "@/app/actions";
import { PendingSubmit } from "@/app/pending-submit";
import { loadMailWorkspace } from "@/server/control-data";

export const dynamic = "force-dynamic";

export default async function MailPage() {
  const { clients, messages } = await loadMailWorkspace();
  return (
    <>
      <header>
        <div>
          <p className="eyebrow">Client communication</p>
          <h1>Mail</h1>
          <p className="sub">
            Send service updates and support messages, and review delivery status.
          </p>
        </div>
      </header>
      <section className="workspaceGrid">
        <div className="panel">
          <div className="panelHead">
            <div>
              <p className="eyebrow">Delivery log</p>
              <h2>Messages</h2>
            </div>
            <span>{messages.length} recent</span>
          </div>
          <div className="tableList">
            {messages.map((message) => (
              <article className="dataRow" key={message.id}>
                <div>
                  <strong>{message.subject}</strong>
                  <p>{message.recipientEmail}</p>
                </div>
                <div>
                  <strong>{message.kind}</strong>
                  <p>{message.createdAt.toLocaleString()}</p>
                </div>
                <span className="status">{message.status}</span>
              </article>
            ))}
          </div>
          {messages.length === 0 && (
            <div className="emptyState">
              <strong>No messages yet</strong>
              <p>Subscription notices and manual messages appear here.</p>
            </div>
          )}
        </div>
        <form action={queueClientMessageAction} className="panel createPanel">
          <div className="panelHead">
            <div>
              <p className="eyebrow">Compose</p>
              <h2>Message a client</h2>
            </div>
          </div>
          <label>
            Client
            <select name="clientId" required>
              <option value="">Select client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name} · {client.contactEmail}
                </option>
              ))}
            </select>
          </label>
          <label>
            Type
            <select name="kind">
              <option value="update">Service update</option>
              <option value="support">Customer support</option>
              <option value="general">General</option>
            </select>
          </label>
          <label>
            Subject
            <input maxLength={240} name="subject" required />
          </label>
          <label>
            Message
            <textarea maxLength={20000} name="bodyText" required rows={10} />
          </label>
          <PendingSubmit pendingLabel="Queueing…">Queue email</PendingSubmit>
        </form>
      </section>
    </>
  );
}
