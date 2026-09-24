import { AppProviders } from "@/app/AppProviders";
import { AppRouter } from "@/app/routes/AppRouter";
import { ToastContainer } from "react-toastify";

function App() {
  return (
    <AppProviders>
      <AppRouter />
      <ToastContainer
        position="top-right"
        autoClose={false}
        closeOnClick
        theme="light"
      />
    </AppProviders>
  );
}

export default App;
