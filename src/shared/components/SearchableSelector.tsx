// FILE: src/components/SearchableSelector.tsx
// ACTION: Create this new reusable component.

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  TouchableWithoutFeedback,
} from 'react-native';
import Modal from 'react-native-modal';
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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(selectedValue);
  const manualInputRef = useRef<TextInput | null>(null);
  const dropdownRef = useRef<View | null>(null);

  // This effect ensures that if the parent component's value changes
  // (e.g., from context), our component reflects it.
  useEffect(() => {
    setInternalValue(selectedValue);
    // If the selected value is not in the predefined list, switch to input mode.
    if (selectedValue && !data.includes(selectedValue)) {
      setIsInputMode(true);
    }
  }, [selectedValue, data]);

  const filteredOptions = useMemo(() => {
    const options = ['Other', ...data];
    const query = searchQuery.trim().toLowerCase();
    if (!query) return options;
    return options.filter(option => option.toLowerCase().includes(query));
  }, [data, searchQuery]);

  const openDropdown = () => {
    setIsDropdownOpen(true);
  };

  const closeDropdown = () => {
    setSearchQuery(selectedValue || '');
    setIsDropdownOpen(false);
  };

  const handleSelect = (selectedItem: string) => {
    if (selectedItem === 'Other') {
      setIsInputMode(true);
      closeDropdown();
      requestAnimationFrame(() => manualInputRef.current?.focus());
      onValueChange('');
    } else {
      setIsInputMode(false);
      setInternalValue(selectedItem);
      setSearchQuery(selectedItem);
      onValueChange(selectedItem);
      closeDropdown();
    }
  };

  const handleTextChange = (text: string) => {
    setInternalValue(text);
    onValueChange(text);
  };

  const switchToPicker = () => {
    setIsInputMode(false);
    setInternalValue('');
    onValueChange('');
  };

  const renderOption = ({ item }: { item: string }) => {
    const isSelected = item === internalValue;
    return (
      <TouchableOpacity
        style={[styles.optionRow, isSelected && styles.optionRowSelected]}
        onPress={() => handleSelect(item)}>
        <Text style={styles.optionText}>{item}</Text>
        {isSelected && <Ionicons name="checkmark" size={18} color="#2563eb" />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      {isInputMode ? (
        <View>
          <TextInput
            ref={manualInputRef}
            style={styles.input}
            placeholder={placeholder}
            value={internalValue}
            onChangeText={handleTextChange}
          />
          <TouchableOpacity onPress={switchToPicker} style={styles.backButton}>
            <Text style={styles.backButtonText}>‹ Back to list</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.selectorInputWrapper}>
            <Ionicons name="search" size={18} color="#9ca3af" />
            <TextInput
              style={styles.selectorInput}
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChangeText={text => {
                setSearchQuery(text);
                setIsDropdownOpen(true);
              }}
              onFocus={openDropdown}
            />
            {!!searchQuery && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color="#9ca3af" />
              </TouchableOpacity>
            )}
          </View>

          {isDropdownOpen && (
            <View style={styles.dropdownWrapper}>
              <TouchableWithoutFeedback onPress={closeDropdown}>
                <View style={styles.dropdownOverlay} />
              </TouchableWithoutFeedback>
              <View style={styles.dropdownContainer}>
                <FlatList
                  data={filteredOptions}
                  keyExtractor={(item, index) => `${item}-${index}`}
                  renderItem={renderOption}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={styles.optionsListContent}
                  style={styles.optionsList}
                />
              </View>
            </View>
          )}
        </>
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
    fontWeight: '600',
    marginBottom: 8,
    color: '#222',
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
    color: '#2563eb',
    fontSize: 14,
  },
  selectorInputWrapper: {
    minHeight: 55,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#d9dce7',
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectorInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
  },
  dropdownWrapper: {
    marginTop: 6,
  },
  dropdownOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  dropdownContainer: {
    marginTop: 6,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    maxHeight: 320,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
  },
  optionsList: {
    maxHeight: 260,
  },
  optionsListContent: {
    paddingBottom: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  optionRowSelected: {
    backgroundColor: '#eef2ff',
  },
  optionText: {
    fontSize: 16,
    color: '#111827',
    flex: 1,
    marginRight: 12,
  },
});

export default SearchableSelector;
