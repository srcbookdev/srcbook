import { auth, provider, signInWithPopup } from '../firebaseConfig';

const Login = () => {
  const handleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Restrição de domínio
      if (user.email?.endsWith('@squadfy.com.br')) {
        console.log('Login bem-sucedido:', user);
        // Continue com o fluxo de autenticação
      } else {
        alert('Você não tem permissão para acessar esta aplicação.');
        await auth.signOut();
      }
    } catch (error) {
      console.error('Erro ao fazer login:', error);
    }
  };

  return (
    <div>
      <button onClick={handleLogin}>Login com Google</button>
    </div>
  );
};

export default Login;
