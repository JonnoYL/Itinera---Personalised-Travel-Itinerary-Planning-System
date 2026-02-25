import { Alert, Modal, StyleSheet, Text, Pressable, View } from "react-native";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";

type HelpPopUpProps = {
  modalVisible: boolean;
  setModalVisible: (visible: boolean) => void;
};

export default function HelpPopUp({
  modalVisible,
  setModalVisible,
}: HelpPopUpProps) {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.centeredView}>
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => {
            Alert.alert("Modal has been closed.");
            setModalVisible(!modalVisible);
          }}
        >
          <View style={styles.centeredView}>
            <View style={styles.modalView}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Forgot your password?</Text>
                <Text style={styles.modalText}>
                  Make sure you’re entering the correct password.{"\n"}
                  Passwords are case-sensitive.{"\n"}
                  If you’ve forgotten it, contact your admin or support to reset
                  it.
                </Text>

                <Text style={styles.modalTitle}>Forgot your username?</Text>
                <Text style={styles.modalText}>
                  Check any notes or documents where you saved it.{"\n"}
                  Usernames are case-sensitive.
                </Text>

                <Text style={styles.modalTitle}>Other tips:</Text>
                <Text style={styles.modalText}>
                  Ensure Caps Lock is off.{"\n"}
                  Refresh the page and try again if login fails.{"\n"}
                  Clear browser cache if issues persist.
                </Text>
              </View>
              <Pressable
                style={[styles.button, styles.buttonClose]}
                onPress={() => setModalVisible(!modalVisible)}
              >
                <Text style={styles.textStyle}>Close</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
        {/* <Pressable
          style={[styles.button, styles.buttonOpen]}
          onPress={() => setModalVisible(true)}>
          <Text style={styles.textStyle}>Show Modal</Text>
        </Pressable> */}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  modalContent: {
    padding: 20,
  },
  modalTitle: {
    fontWeight: "bold",
    fontSize: 16,
    marginTop: 10,
    marginBottom: 5,
  },
  modalText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalView: {
    margin: 20,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 35,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  button: {
    borderRadius: 20,
    padding: 10,
    elevation: 2,
  },
  buttonOpen: {
    backgroundColor: "#F194FF",
  },
  buttonClose: {
    backgroundColor: "#2196F3",
  },
  textStyle: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
  },
});
