// Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
    getFirestore,
    collection,
    getDocs,
    doc,
    getDoc,
    addDoc,
    query,
    where,
    orderBy
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
const firebaseConfig = {
  apiKey: "AIzaSyDbW3IccnuXe4FAwJjWhxrKRnIsaQ7eHng",
  authDomain: "doubt-factory.firebaseapp.com",
  projectId: "doubt-factory",
  storageBucket: "doubt-factory.firebasestorage.app",
  messagingSenderId: "941667840808",
  appId: "1:941667840808:web:c52c99dadc59f25e1e161d"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export async function getQuestions() {

    const snapshot = await getDocs(collection(db, "questions"));

   return snapshot.docs.map(doc => ({
    ...doc.data(),
    docId: doc.id
}));

}
export async function getQuestionById(id) {

    const docRef = doc(db, "questions", id);

    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {

        return {
            id: docSnap.id,
            ...docSnap.data()
        };

    }

    return null;

}
export async function getComments(questionId) {

    const q = query(
        collection(db, "comments"),
        where("questionId", "==", questionId),
        orderBy("time", "asc")
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));

}

export async function addComment(comment) {

    await addDoc(collection(db, "comments"), comment);

}