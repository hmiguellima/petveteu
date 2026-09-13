import { signIn } from '../actions';

type PageProperties = {
  searchParams: { error?: string; registered?: string };
};

const errorMessages: Record<string, string> = {
  credentials: 'Email ou palavra-passe incorretos.',
  profile: 'Não foi possível carregar o perfil da conta.',
};

export default function Page({ searchParams }: PageProperties): React.JSX.Element {
  const errorMessage = searchParams.error ? errorMessages[searchParams.error] : undefined;

  return (
    <section className="mx-auto mt-20 max-w-md card">
      <h1 className="mb-6 text-3xl font-bold">Entrar</h1>
      {searchParams.registered ? (
        <p role="status" className="mb-4 text-green-700">
          Conta criada. Confirme o email, se solicitado, e inicie sessão.
        </p>
      ) : null}
      {errorMessage ? (
        <p role="alert" className="mb-4 text-red-700">
          {errorMessage}
        </p>
      ) : null}
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
