import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList } from 'react-native';
import { Controller, Control, FieldValues, Path, FieldError } from 'react-hook-form';
import { ChevronDown, Check } from 'lucide-react-native';

interface Option {
  label: string;
  value: string;
}

interface FormSelectProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  placeholder?: string;
  options: Option[];
  error?: FieldError;
}

export function FormSelect<T extends FieldValues>({
  control,
  name,
  label,
  placeholder = 'Select an option',
  options,
  error,
}: FormSelectProps<T>) {
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, value } }) => {
          const selectedOption = options.find(option => option.value === value);
          
          return (
            <>
              <TouchableOpacity
                style={[styles.selectButton, error && styles.errorInput]}
                onPress={() => setModalVisible(true)}
              >
                <Text style={[
                  styles.selectText,
                  !selectedOption && styles.placeholderText
                ]}>
                  {selectedOption ? selectedOption.label : placeholder}
                </Text>
                <ChevronDown size={20} color="#8E8E93" />
              </TouchableOpacity>
              
              <Modal
                visible={modalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setModalVisible(false)}
              >
                <View style={styles.modalOverlay}>
                  <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>{label}</Text>
                      <TouchableOpacity
                        onPress={() => setModalVisible(false)}
                        style={styles.closeButton}
                      >
                        <Text style={styles.closeButtonText}>Close</Text>
                      </TouchableOpacity>
                    </View>
                    
                    <FlatList
                      data={options}
                      keyExtractor={(item) => item.value}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          style={styles.optionItem}
                          onPress={() => {
                            onChange(item.value);
                            setModalVisible(false);
                          }}
                        >
                          <Text style={styles.optionText}>{item.label}</Text>
                          {item.value === value && (
                            <Check size={20} color="#63C7B8" />
                          )}
                        </TouchableOpacity>
                      )}
                    />
                  </View>
                </View>
              </Modal>
            </>
          );
        }}
      />
      {error && <Text style={styles.errorText}>{error.message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: '#1A1A1A',
    marginBottom: 6,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
  },
  selectText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#1A1A1A',
  },
  placeholderText: {
    color: '#8E8E93',
  },
  errorInput: {
    borderColor: '#FF3B30',
  },
  errorText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  modalTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#1A1A1A',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    color: '#63C7B8',
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  optionText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#1A1A1A',
  },
}); 