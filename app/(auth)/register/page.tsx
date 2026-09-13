import Link from 'next/link';
import { register } from '../actions';

type PageProperties = {
  searchParams: { error?: string };
};

const errorMessages: Record<string, string> = {
  conflict: 'Já existe uma conta com esse email ou telemóvel.',
  invalid: 'Confirme os dados introduzidos e tente novamente.',
};

export default function Page({ searchParams }: PageProperties): React.JSX.Element {
  const errorMessage = searchParams.error ? errorMessages[searchParams.error] : undefined;

  return (
    <section className="mx-auto my-12 max-w-lg card">
      <h1 className="mb-6 text-3xl font-bold">Criar conta</h1>
      {errorMessage ? (
        <p role="alert" className="mb-4 text-red-700">
          {errorMessage}
        </p>
      ) : null}
      <form action={register}>
        <label>
          Nome completo
          <input required name="fullName" maxLength={120} />
        </label>
        <label>
          Email
          <input required type="email" name="email" />
        </label>
        <label>
          Telemóvel E.164
          <input required name="phone" placeholder="+351912345678" />
        </label>
        <label>
          Palavra-passe
          <input required minLength={10} type="password" name="password" />
        </label>
        <label>
          Idioma
          <select name="locale">
            <option value="pt-PT">Português</option>
            <option value="en">English</option>
          </select>
        </label>
        <p className="text-sm">
          Ao criar uma conta, confirma que consultou o{' '}
          <Link className="underline" href="/privacy">
            aviso de privacidade
          </Link>
          .
        </p>
        <button>Criar conta</button>
      </form>
    </section>
  );
}
