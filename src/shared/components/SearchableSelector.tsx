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
  Keyboard,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  label: string;
  data: string[];
  selectedValue: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  searchPlaceholder?: string;
  id: string;
  onOpen?: (id: string) => void;
  isActive?: boolean;
  showOther?: boolean;
  tooltipText?: string;
}

const SearchableSelector: React.FC<Props> = ({
  label,
  data,
  selectedValue,
  onValueChange,
  placeholder,
  searchPlaceholder = 'Search...',
  id,
  onOpen,
  isActive = false,
  showOther = true,
  tooltipText,
}) => {
  const [isInputMode, setIsInputMode] = useState(false);
  const [internalValue, setInternalValue] = useState(selectedValue);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(selectedValue);
  const [previousInputValue, setPreviousInputValue] = useState('');
  const [isOtherSelected, setIsOtherSelected] = useState(false);
  const manualInputRef = useRef<TextInput | null>(null);
  const selectorInputRef = useRef<TextInput | null>(null);
  const dropdownRef = useRef<View | null>(null);

  // Sync internalValue with selectedValue from parent
  useEffect(() => {
    setInternalValue(selectedValue);
    setSearchQuery(selectedValue);
    // If the selected value is not in the predefined list, switch to input mode.
    if (selectedValue && !data.includes(selectedValue)) {
      setIsInputMode(true);
      setIsOtherSelected(true);
    } else {
      setIsOtherSelected(false);
    }
  }, [selectedValue, data]);

  // Handle active state changes - reset searchQuery when becoming inactive
  useEffect(() => {
    if (!isActive && isDropdownOpen) {
      closeDropdown();
      setSearchQuery(selectedValue || '');
    }
  }, [isActive, selectedValue]);

  // Auto-switch back to picker mode when user modifies text in input mode
  useEffect(() => {
    if (isInputMode && isOtherSelected && previousInputValue !== '') {
      // Check if text has changed from what was there when "Other" was selected
      // Only trigger if user has actually modified the text (not just initial render)
      const hasChanged = internalValue !== previousInputValue;
      
      if (hasChanged) {
        // User is modifying the text
        const matches = data.filter(item => 
          item.toLowerCase().includes(internalValue.toLowerCase())
        );
        
        // Switch back to picker mode if there are matches or text is empty
        if (matches.length > 0 || internalValue === '') {
          setIsInputMode(false);
          setIsOtherSelected(false);
          // Set searchQuery to selectedValue (as per requirements)
          setSearchQuery(selectedValue || '');
          setIsDropdownOpen(true);
          if (onOpen) {
            onOpen(id);
          }
          // Focus the selector input
          setTimeout(() => {
            selectorInputRef.current?.focus();
          }, 100);
        }
      }
    }
  }, [internalValue, isInputMode, isOtherSelected, previousInputValue, data, selectedValue, id, onOpen]);

  const filteredOptions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    
    // Filter data based on search query
    const filteredData = query 
      ? data.filter(item => item.toLowerCase().includes(query))
      : data;
    
    // Determine if "Other" should be shown
    const shouldShowOther = showOther && (filteredData.length === 0 || query === '');
    
    // Build options array with "Other" at top if it should be shown
    const options = shouldShowOther ? ['Other', ...filteredData] : filteredData;
    
    return options;
  }, [data, searchQuery, showOther]);

  const openDropdown = () => {
    setIsDropdownOpen(true);
    if (onOpen) {
      onOpen(id);
    }
  };

  const closeDropdown = () => {
    // Don't reset searchQuery here - keep typed text
    setIsDropdownOpen(false);
  };

  const handleSelect = (selectedItem: string) => {
    if (selectedItem === 'Other') {
      // Store the current searchQuery as previousInputValue
      const currentText = searchQuery.trim();
      setPreviousInputValue(currentText);
      
      // Switch to input mode
      setIsInputMode(true);
      setIsOtherSelected(true);
      
      // Fill text box with what they typed (if any)
      if (currentText) {
        setInternalValue(currentText);
        onValueChange(currentText);
      } else {
        setInternalValue('');
        onValueChange('');
      }
      
      // Close dropdown
      closeDropdown();
      
      // Keep keyboard open and focus input
      setTimeout(() => {
        manualInputRef.current?.focus();
        // Set cursor to end if text exists
        if (currentText && manualInputRef.current) {
          manualInputRef.current.setNativeProps({ selection: { start: currentText.length, end: currentText.length } });
        }
      }, 50);
    } else {
      // Regular selection
      setIsInputMode(false);
      setIsOtherSelected(false);
      setInternalValue(selectedItem);
      setSearchQuery(selectedItem);
      onValueChange(selectedItem);
      closeDropdown();
      
      // Dismiss keyboard after brief delay
      setTimeout(() => {
        Keyboard.dismiss();
        selectorInputRef.current?.blur();
      }, 100);
    }
  };

  const handleTextChange = (text: string) => {
    setInternalValue(text);
    onValueChange(text);
  };

  const handleOutsidePress = () => {
    closeDropdown();
    Keyboard.dismiss();
    // Keep searchQuery as is (don't reset)
  };

  const renderOption = ({ item }: { item: string }) => {
    const isSelected = item === internalValue || item === selectedValue;
    const isHighlighted = item !== 'Other' && searchQuery && 
      item.toLowerCase().includes(searchQuery.toLowerCase()) &&
      item.toLowerCase() === searchQuery.toLowerCase();
    
    return (
      <TouchableOpacity
        style={[
          styles.optionRow, 
          isSelected && styles.optionRowSelected,
          isHighlighted && styles.optionRowHighlighted
        ]}
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
          {isOtherSelected && tooltipText && (
            <Text style={styles.tooltip}>{tooltipText}</Text>
          )}
        </View>
      ) : (
        <>
          <View style={styles.selectorInputWrapper}>
            <Ionicons name="search" size={18} color="#9ca3af" />
            <TextInput
              ref={selectorInputRef}
              style={styles.selectorInput}
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChangeText={text => {
                setSearchQuery(text);
                setIsDropdownOpen(true);
                if (onOpen) {
                  onOpen(id);
                }
              }}
              onFocus={openDropdown}
            />
            {!!searchQuery && (
              <TouchableOpacity onPress={() => {
                setSearchQuery('');
                setIsDropdownOpen(true);
              }}>
                <Ionicons name="close-circle" size={18} color="#9ca3af" />
              </TouchableOpacity>
            )}
          </View>

          {isDropdownOpen && isActive && (
            <>
              <TouchableWithoutFeedback onPress={handleOutsidePress}>
                <View style={styles.overlay} />
              </TouchableWithoutFeedback>
              <View style={styles.dropdownWrapper}>
                <View style={styles.dropdownContainer} ref={dropdownRef}>
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
            </>
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
  tooltip: {
    marginTop: 6,
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
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
  overlay: {
    position: 'absolute',
    top: -Dimensions.get('window').height,
    left: -Dimensions.get('window').width,
    width: Dimensions.get('window').width * 3,
    height: Dimensions.get('window').height * 3,
    backgroundColor: 'transparent',
  },
  dropdownWrapper: {
    marginTop: 6,
    position: 'relative',
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
  optionRowHighlighted: {
    backgroundColor: '#f0f9ff',
  },
  optionText: {
    fontSize: 16,
    color: '#111827',
    flex: 1,
    marginRight: 12,
  },
});

export default SearchableSelector;
