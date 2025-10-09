// FILE: src/components/SearchableSelector.tsx
// ACTION: Create this new reusable component.

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import SelectDropdown from 'react-native-select-dropdown';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  label: string;
  data: string[];
  selectedValue: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  searchPlaceholder?: string;
}

const SearchableSelector: React.FC<Props> = ({
  label,
  data,
  selectedValue,
  onValueChange,
  placeholder,
  searchPlaceholder = 'Search...',
}) => {
  const [isInputMode, setIsInputMode] = useState(false);
  const [internalValue, setInternalValue] = useState(selectedValue);

  // This effect ensures that if the parent component's value changes
  // (e.g., from context), our component reflects it.
  useEffect(() => {
    setInternalValue(selectedValue);
    // If the selected value is not in the predefined list, switch to input mode.
    if (selectedValue && !data.includes(selectedValue)) {
      setIsInputMode(true);
    }
  }, [selectedValue, data]);

  const handleSelect = (selectedItem: string) => {
    if (selectedItem === 'Other') {
      setIsInputMode(true);
      onValueChange(''); // Clear the value when switching to input mode
    } else {
      setIsInputMode(false);
      onValueChange(selectedItem);
    }
  };

  const handleTextChange = (text: string) => {
    setInternalValue(text);
    onValueChange(text);
  };

  const switchToDropdown = () => {
    setIsInputMode(false);
    onValueChange(''); // Clear value when switching back
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      {isInputMode ? (
        <View>
          <TextInput
            style={styles.input}
            placeholder={placeholder}
            value={internalValue}
            onChangeText={handleTextChange}
            autoFocus={true}
          />
          <TouchableOpacity onPress={switchToDropdown} style={styles.backButton}>
            <Text style={styles.backButtonText}>‹ Back to list</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <SelectDropdown
          data={['Other', ...data]} // Add "Other" to the top of the list
          onSelect={(selectedItem) => handleSelect(selectedItem)}
          defaultValue={internalValue}
          buttonTextAfterSelection={(selectedItem) => selectedItem}
          rowTextForSelection={(item) => item}
          buttonStyle={styles.dropdownButton}
          buttonTextStyle={styles.dropdownButtonText}
          renderDropdownIcon={() => <Ionicons name="chevron-down" size={24} color="#888" />}
          dropdownStyle={styles.dropdown}
          rowStyle={styles.dropdownRow}
          rowTextStyle={styles.dropdownRowText}
          search
          searchInputStyle={styles.searchInput}
          searchPlaceHolder={searchPlaceholder}
          defaultButtonText={placeholder}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 15,
    borderRadius: 8,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  backButton: {
    marginTop: 8,
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 14,
  },
  dropdownButton: {
    width: '100%',
    height: 55,
    backgroundColor: '#FFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  dropdownButtonText: {
    color: '#444',
    textAlign: 'left',
    fontSize: 16,
  },
  dropdown: {
    backgroundColor: '#EFEFEF',
    borderRadius: 8,
  },
  dropdownRow: {
    backgroundColor: '#EFEFEF',
    borderBottomColor: '#C5C5C5',
  },
  dropdownRowText: {
    color: '#444',
    textAlign: 'left',
  },
  searchInput: {
    backgroundColor: '#EFEFEF',
    borderRadius: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#C5C5C5',
  },
});

export default SearchableSelector;
