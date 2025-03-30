import './App.css';
import AppRoutes from "./router/AppRoutes";
import Header from "./components/common/Header/Header";
import Footer from "./components/common/Footer/Footer";
import './index.css';

const App = () => {
    return (
        <div className={"App"}>
            <Header />
            <main>
                <AppRoutes />
            </main>
            <Footer />
        </div>
    )
}

export default App;
