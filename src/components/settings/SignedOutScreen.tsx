import { Icon } from "../Icon";

export function SignedOutScreen({ onReturn }: { onReturn: () => void }) {
  return (
    <main className="signed-out-screen">
      <div className="signed-out-card">
        <div className="brand-mark">
          <Icon name="note" size={22} />
        </div>
        <span className="signed-out-kicker">SCRIBE ACCOUNT</span>
        <h1>You’re signed out</h1>
        <p>
          This is a preview account, so no account session was changed. Connect
          authentication to enable real sign-in and sign-out.
        </p>
        <button className="settings-primary-button" onClick={onReturn}>
          Return to Scribe
        </button>
      </div>
    </main>
  );
}
