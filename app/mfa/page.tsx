export default function Page(): React.JSX.Element {
  return (
    <section className="mx-auto mt-20 max-w-md card">
      <h1 className="text-2xl font-bold">Autenticação multifator obrigatória</h1>
      <p className="mt-3">
        Configure e valide um fator TOTP no Supabase Auth antes de aceder à área veterinária em
        produção.
      </p>
    </section>
  );
}
