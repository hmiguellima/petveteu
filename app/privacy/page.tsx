export default function Page(): React.JSX.Element {
  return (
    <article className="prose mx-auto card">
      <h1>Aviso de privacidade / Privacy notice</h1>
      <p className="rounded bg-amber-100 p-3">
        <strong>Rascunho não aprovado:</strong> a produção permanece bloqueada até aprovação pela
        clínica e revisão jurídica portuguesa.
      </p>
      <h2>Finalidades e direitos</h2>
      <p>
        A clínica usa os dados de contacto, registos de animais e vacinação para gerir a relação
        clínica e enviar lembretes pedidos. Contacte a clínica para acesso, exportação, correção,
        oposição, limitação, apagamento ou reclamação à CNPD.
      </p>
      <h2>Purposes and rights</h2>
      <p>
        The practice uses contact, pet, and vaccination data to manage clinical records and
        requested reminders. Contact the practice for access, export, correction, objection,
        restriction, erasure, or to complain to the Portuguese supervisory authority.
      </p>
    </article>
  );
}
