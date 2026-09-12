import { signIn } from '../actions';

export default function Page(): React.JSX.Element {
  return (
    <section className="mx-auto mt-20 max-w-md card">
      <h1 className="mb-6 text-3xl font-bold">Entrar</h1>
      <form action={signIn}>
        <label>
          Email
          <input required type="email" name="email" autoComplete="email" />
        </label>
        <label>
          Palavra-passe
          <input required type="password" name="password" autoComplete="current-password" />
        </label>
        <button>Entrar</button>
      </form>
    </section>
  );
}
