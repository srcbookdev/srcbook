import { Link , useRouteError } from 'react-router-dom';

export default function ErrorPage() {
  const error = useRouteError() as { statusText: string; message: string };
  console.error(error);

  return (
    <div className="flex flex-col justify-center items-center h-screen w-full">
      <h1 className="text-xl font-bold">Oops!</h1>

      <p>
        Sorry, an unexpected error has occured:
        <span className="text-destructive italic"> {error.statusText || error.message}</span>
      </p>

      <Link className="text-accent underline underline-offset-2" to="/">
        go home
      </Link>
    </div>
  );
}
