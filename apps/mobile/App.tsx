import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { COLLECTIONS, COURSES, PREFERRED_TIMES, enquiryInputSchema } from '@steerly/shared';
import { db } from './firebase';

export default function App() {
  return (
    <SafeAreaProvider>
      <EnquiryScreen />
    </SafeAreaProvider>
  );
}

function EnquiryScreen() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [course, setCourse] = useState<string>('');
  const [preferredTime, setPreferredTime] = useState<string>('');

  // Modals for selection
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showTimeModal, setShowTimeModal] = useState(false);

  // Status states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async () => {
    setErrorMessage('');

    const parsed = enquiryInputSchema.safeParse({ name, phone, course, preferredTime });
    if (!parsed.success) {
      setErrorMessage(parsed.error.issues[0]?.message ?? 'Please check the form.');
      return;
    }

    setIsSubmitting(true);

    try {
      await addDoc(collection(db, COLLECTIONS.enquiries), {
        ...parsed.data,
        status: 'New',
        createdAt: serverTimestamp(),
      });

      // Reset form and show success screen
      setName('');
      setPhone('');
      setCourse('');
      setPreferredTime('');
      setIsSubmitted(true);
    } catch (error) {
      console.error('Submission error:', error);
      setErrorMessage(
        'Failed to submit enquiry. Please check your internet connection and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setIsSubmitted(false);
    setErrorMessage('');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoText}>S</Text>
            </View>
            <Text style={styles.title}>Steerly</Text>
            <Text style={styles.subtitle}>Start Your Driving Journey Today</Text>
          </View>

          {isSubmitted ? (
            /* Success Card */
            <View style={styles.successCard}>
              <View style={styles.successIconContainer}>
                <Text style={styles.successIcon}>✓</Text>
              </View>
              <Text style={styles.successTitle}>Enquiry Submitted!</Text>
              <Text style={styles.successMessage}>
                Thank you! We'll contact you soon with course details and schedule
                options.
              </Text>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleReset}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryButtonText}>Submit Another Enquiry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Enquiry Form Card */
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>Book an Enquiry</Text>
              <Text style={styles.formDescription}>
                Fill out the quick form below and our certified instructors will get
                in touch.
              </Text>

              {/* Error banner */}
              {errorMessage ? (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorText}>⚠ {errorMessage}</Text>
                </View>
              ) : null}

              {/* Full Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Full Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. John Doe"
                  placeholderTextColor="#64748b"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </View>

              {/* Phone Number */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Phone Number (10 digits) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 9876543210"
                  placeholderTextColor="#64748b"
                  value={phone}
                  onChangeText={(text) => setPhone(text.replace(/\D/g, '').slice(0, 10))}
                  keyboardType="numeric"
                  maxLength={10}
                />
              </View>

              {/* Preferred Course Picker */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Preferred Course *</Text>
                <TouchableOpacity
                  style={styles.pickerTrigger}
                  onPress={() => setShowCourseModal(true)}
                  activeOpacity={0.8}
                >
                  <Text style={course ? styles.pickerValue : styles.pickerPlaceholder}>
                    {course || 'Select a course...'}
                  </Text>
                  <Text style={styles.dropdownArrow}>▼</Text>
                </TouchableOpacity>
              </View>

              {/* Preferred Time Picker */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Preferred Time *</Text>
                <TouchableOpacity
                  style={styles.pickerTrigger}
                  onPress={() => setShowTimeModal(true)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={preferredTime ? styles.pickerValue : styles.pickerPlaceholder}
                  >
                    {preferredTime || 'Select preferred time...'}
                  </Text>
                  <Text style={styles.dropdownArrow}>▼</Text>
                </TouchableOpacity>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  isSubmitting ? styles.buttonDisabled : undefined,
                ]}
                onPress={handleSubmit}
                disabled={isSubmitting}
                activeOpacity={0.85}
              >
                {isSubmitting ? (
                  <View style={styles.buttonLoadingRow}>
                    <ActivityIndicator size="small" color="#0f172a" />
                    <Text style={[styles.primaryButtonText, { marginLeft: 8 }]}>
                      Submitting...
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.primaryButtonText}>Submit Enquiry</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Course Selection Modal */}
      <Modal
        visible={showCourseModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCourseModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCourseModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select a Course</Text>
            {COURSES.map((item) => (
              <TouchableOpacity
                key={item}
                style={[
                  styles.modalOption,
                  course === item ? styles.modalOptionActive : undefined,
                ]}
                onPress={() => {
                  setCourse(item);
                  setShowCourseModal(false);
                }}
              >
                <Text
                  style={[
                    styles.modalOptionText,
                    course === item ? styles.modalOptionTextActive : undefined,
                  ]}
                >
                  {item}
                </Text>
                {course === item ? (
                  <Text style={styles.modalCheckmark}>✓</Text>
                ) : null}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowCourseModal(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Preferred Time Selection Modal */}
      <Modal
        visible={showTimeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTimeModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowTimeModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Preferred Time</Text>
            {PREFERRED_TIMES.map((item) => (
              <TouchableOpacity
                key={item}
                style={[
                  styles.modalOption,
                  preferredTime === item ? styles.modalOptionActive : undefined,
                ]}
                onPress={() => {
                  setPreferredTime(item);
                  setShowTimeModal(false);
                }}
              >
                <Text
                  style={[
                    styles.modalOptionText,
                    preferredTime === item ? styles.modalOptionTextActive : undefined,
                  ]}
                >
                  {item}
                </Text>
                {preferredTime === item ? (
                  <Text style={styles.modalCheckmark}>✓</Text>
                ) : null}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowTimeModal(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoBadge: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoText: {
    color: '#F59E0B',
    fontSize: 26,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f8fafc',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
  },
  formCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 22,
    width: '100%',
    maxWidth: 440,
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 4,
  },
  formDescription: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 18,
    lineHeight: 18,
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#ef4444',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 13,
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#cbd5e1',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#f8fafc',
  },
  pickerTrigger: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerPlaceholder: {
    fontSize: 15,
    color: '#64748b',
    flex: 1,
  },
  pickerValue: {
    fontSize: 15,
    color: '#f8fafc',
    flex: 1,
  },
  dropdownArrow: {
    color: '#94a3b8',
    fontSize: 11,
    marginLeft: 8,
  },
  primaryButton: {
    backgroundColor: '#F59E0B',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  buttonLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '700',
  },
  successCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 26,
    width: '100%',
    maxWidth: 440,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
  },
  successIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 2,
    borderColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successIcon: {
    color: '#10b981',
    fontSize: 32,
    fontWeight: 'bold',
  },
  successTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 8,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 14,
    color: '#cbd5e1',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    width: '100%',
    maxWidth: 380,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginBottom: 6,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalOptionActive: {
    borderColor: '#F59E0B',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  modalOptionText: {
    fontSize: 15,
    color: '#cbd5e1',
  },
  modalOptionTextActive: {
    color: '#F59E0B',
    fontWeight: '600',
  },
  modalCheckmark: {
    color: '#F59E0B',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalCancelButton: {
    marginTop: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
  },
});
