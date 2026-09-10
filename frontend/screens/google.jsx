//import { GoogleSignin } from "@react-native-google-signin/google-signin";
//  useEffect(() => {
    //GoogleSignin.configure({
      //webClientId:
        //"609585601175-nue1jb7oui1thg0iqdtq74k7anej2p80.apps.googleusercontent.com",
      //offlineAccess: true,
    //});
  //}, []);

  //async function fazerLoginGoogle() {
    //try {
      //setCarregando(true);
      //setErro(null);

      //await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      // Limpa a sessão local anterior para forçar o ecrã de seleção de contas
      //try {
        //await GoogleSignin.signOut();
      //} catch (e) {
        // Ignora caso não existisse nenhuma sessão ativa para fazer logout
      //}

      //const userInfo = await GoogleSignin.signIn();
      //const idToken = userInfo.data?.idToken || userInfo.idToken;

      //if (idToken) {
        //const respostaBackend = await fetch(`${API_URL}/login-google-direct`, {
          //method: "POST",
          //headers: { "Content-Type": "application/json" },
          //body: JSON.stringify({ token: idToken }),
        //});

        //const dadosBackend = await respostaBackend.json();

        //if (respostaBackend.ok && dadosBackend.token) {
          //await AsyncStorage.setItem("token", dadosBackend.token);
          //if (typeof onLogin === "function") onLogin();
        //} else {
          //setErro(dadosBackend.erro || "Failed to authenticate with backend.");
        //}
      //}
    //} catch (error) {
      //console.error("Google Sign-In Error:", error);
      //Alert.alert("Error", "Google sign in failed or was cancelled.");
      //Alert.alert("Error", `${error.code || "no code"}: ${error.message || JSON.stringify(error)}`);
    //} finally {
      //setCarregando(false);
    //}



    //__________________prencher depois
    