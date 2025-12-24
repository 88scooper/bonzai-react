// Firebase has been removed - this file is kept for backward compatibility
// All functions return empty/mock data

const db = null;

function userCol(userId) {
  if (!db) {
    throw new Error('Database not available. Please check your Firebase configuration.');
  }
  return doc(db, "users", userId);
}

function propertiesCol(userId) {
  return collection(userCol(userId), "properties");
}

function propertyDoc(userId, propertyId) {
  return doc(propertiesCol(userId), propertyId);
}

function versionsCol(userId, propertyId) {
  return collection(propertyDoc(userId, propertyId), "versions");
}

export async function addProperty(userId, propertyData) {
  const colRef = propertiesCol(userId);
  const payload = { ...propertyData, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
  const newDoc = await addDoc(colRef, payload);
  return newDoc.id;
}

export function getProperties(userId, callback) {
  const q = query(propertiesCol(userId), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(items);
  });
}

export async function getProperty(userId, propertyId) {
  const snap = await getDoc(propertyDoc(userId, propertyId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function updateProperty(userId, propertyId, propertyData) {
  await updateDoc(propertyDoc(userId, propertyId), { ...propertyData, updatedAt: serverTimestamp() });
}

export async function deleteProperty(userId, propertyId) {
  await deleteDoc(propertyDoc(userId, propertyId));
}

export async function addPropertyVersion(userId, propertyId, versionData) {
  const colRef = versionsCol(userId, propertyId);
  const payload = { ...versionData, createdAt: serverTimestamp() };
  const newDoc = await addDoc(colRef, payload);
  return newDoc.id;
}

export async function getPropertyVersions(userId, propertyId) {
  const q = query(versionsCol(userId, propertyId), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Mortgage functions
function mortgagesCol(userId) {
  if (!db) {
    throw new Error('Database not available. Please check your Firebase configuration.');
  }
  return collection(userCol(userId), "mortgages");
}

function mortgageDoc(userId, mortgageId) {
  return doc(mortgagesCol(userId), mortgageId);
}

export async function addMortgage(userId, mortgageData) {
  const colRef = mortgagesCol(userId);
  const payload = { ...mortgageData, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
  const newDoc = await addDoc(colRef, payload);
  return newDoc.id;
}

export function getMortgages(userId, callback) {
  const q = query(mortgagesCol(userId), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(items);
  });
}

export async function getMortgage(userId, mortgageId) {
  const snap = await getDoc(mortgageDoc(userId, mortgageId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function updateMortgage(userId, mortgageId, mortgageData) {
  await updateDoc(mortgageDoc(userId, mortgageId), { ...mortgageData, updatedAt: serverTimestamp() });
}

export async function deleteMortgage(userId, mortgageId) {
  await deleteDoc(mortgageDoc(userId, mortgageId));
}

export async function getMortgagesByProperty(userId, propertyId) {
  const q = query(mortgagesCol(userId), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter(mortgage => mortgage.propertyId === propertyId);
}


