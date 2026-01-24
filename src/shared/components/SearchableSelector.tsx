// FILE: src/components/SearchableSelector.tsx
// ACTION: Create this new reusable component.

import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
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
  returnKeyType?: 'done' | 'next' | 'search' | 'go' | 'send';
  onFocusScroll?: () => void;
  onSelectionComplete?: () => void; // Callback when selection is made
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
  returnKeyType = 'search',
  onFocusScroll,
  onSelectionComplete,
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
  const inputWrapperRef = useRef<React.ElementRef<
    typeof TouchableOpacity
  > | null>(null);
  const [inputLayout, setInputLayout] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });

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
      // Don't reset searchQuery when becoming inactive - preserve user's typed text
      // The text will be preserved and can be used when they come back to this selector
      // setSearchQuery(selectedValue || ''); // Commented out to preserve user input
    }
  }, [isActive, selectedValue]);

  // Auto-focus when becoming active
  useEffect(() => {
    if (isActive && !isInputMode) {
      // Focus the selector input when it becomes active
      // Use a slightly longer timeout to ensure the component is fully rendered
      setTimeout(() => {
        selectorInputRef.current?.focus();
        // Also ensure dropdown opens when focused
        setIsDropdownOpen(true);
        if (onOpen) {
          onOpen(id);
        }
      }, 150);
    }
  }, [isActive, isInputMode, id, onOpen]);

  // Auto-switch back to picker mode when user modifies text in input mode
  useEffect(() => {
    if (isInputMode && isOtherSelected && previousInputValue !== '') {
      // Check if text has changed from what was there when "Other" was selected
      // Only trigger if user has actually modified the text (not just initial render)
      const hasChanged = internalValue !== previousInputValue;

      if (hasChanged) {
        // User is modifying the text
        const matches = data.filter(item =>
          item.toLowerCase().includes(internalValue.toLowerCase()),
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
  }, [
    internalValue,
    isInputMode,
    isOtherSelected,
    previousInputValue,
    data,
    selectedValue,
    id,
    onOpen,
  ]);

  const filteredOptions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    // Filter data based on search query
    const filteredData = query
      ? data.filter(item => item.toLowerCase().includes(query))
      : data;

    // Determine if "Other" should be shown
    const shouldShowOther =
      showOther && (filteredData.length === 0 || query === '');

    // Build options array with "Other" at top if it should be shown
    const options = shouldShowOther ? ['Other', ...filteredData] : filteredData;

    return options;
  }, [data, searchQuery, showOther]);

  const openDropdown = () => {
    // Set state first to ensure immediate UI update
    setIsDropdownOpen(true);
    // Then notify parent
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
          manualInputRef.current.setNativeProps({
            selection: { start: currentText.length, end: currentText.length },
          });
        }
      }, 50);
    } else {
      // Regular selection - update state immediately (no delay)
      setIsInputMode(false);
      setIsOtherSelected(false);
      setInternalValue(selectedItem);
      setSearchQuery(selectedItem);
      onValueChange(selectedItem);
      closeDropdown();

      // Call selection complete callback to trigger auto-navigation
      if (onSelectionComplete) {
        // Use setTimeout with 0 delay to ensure state updates are processed first
        setTimeout(() => {
          onSelectionComplete();
        }, 0);
      }

      // Don't dismiss keyboard - keep it open for next selector
    }
  };

  const handleTextChange = (text: string) => {
    setInternalValue(text);
    onValueChange(text);
  };

  const handleOutsidePress = useCallback(() => {
    // Only close dropdown, keep keyboard open so user can keep typing
    closeDropdown();
    // Don't dismiss keyboard - let user continue typing
  }, []);

  const handleInputLayout = () => {
    if (inputWrapperRef.current) {
      // Use setTimeout to ensure layout is complete before measuring
      setTimeout(() => {
        inputWrapperRef.current?.measureInWindow(
          (x: number, y: number, width: number, height: number) => {
            setInputLayout({ x, y, width, height });
          },
        );
      }, 0);
    }
  };

  const renderOption = (item: string, index: number) => {
    const isSelected = item === internalValue || item === selectedValue;
    const isHighlighted =
      item !== 'Other' &&
      searchQuery &&
      item.toLowerCase().includes(searchQuery.toLowerCase()) &&
      item.toLowerCase() === searchQuery.toLowerCase();

    return (
      <TouchableOpacity
        key={`${item}-${index}`}
        style={[
          styles.optionRow,
          isSelected ? styles.optionRowSelected : undefined,
          isHighlighted ? styles.optionRowHighlighted : undefined,
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
            returnKeyType={returnKeyType}
            onSubmitEditing={() => {
              // Dismiss keyboard when Done is pressed
              Keyboard.dismiss();
            }}
          />
          {isOtherSelected && tooltipText && (
            <Text style={styles.tooltip}>{tooltipText}</Text>
          )}
        </View>
      ) : (
        <>
          <TouchableOpacity
            ref={inputWrapperRef}
            style={styles.selectorInputWrapper}
            onLayout={handleInputLayout}
            onPress={() => {
              // Focus the TextInput when wrapper is tapped
              // Use setTimeout to ensure focus happens after any state updates
              setTimeout(() => {
                selectorInputRef.current?.focus();
                // The onFocus handler will handle opening dropdown and calling onOpen
              }, 0);
            }}
            activeOpacity={1}>
            <Ionicons name="search" size={18} color="#9ca3af" />
            <TextInput
              ref={selectorInputRef}
              style={styles.selectorInput}
              placeholder={searchPlaceholder}
              value={searchQuery}
              returnKeyType={returnKeyType}
              onChangeText={text => {
                setSearchQuery(text);
                setIsDropdownOpen(true);
                handleInputLayout(); // Update position when text changes
                if (onOpen) {
                  onOpen(id);
                }
              }}
              onSubmitEditing={() => {
                // When Done is pressed, check if there's a matching option
                const trimmedQuery = searchQuery.trim();
                if (trimmedQuery) {
                  // Find exact match (case-insensitive)
                  const matchingOption = data.find(
                    item => item.toLowerCase() === trimmedQuery.toLowerCase(),
                  );
                  if (matchingOption) {
                    // Auto-select the matching option
                    handleSelect(matchingOption);
                    return;
                  }
                }

                // If we have a selected value, trigger navigation to next selector
                if (selectedValue && onSelectionComplete) {
                  Keyboard.dismiss();
                  setTimeout(() => {
                    onSelectionComplete();
                  }, 0);
                  return;
                }

                // Otherwise just dismiss keyboard, keep text
                Keyboard.dismiss();
              }}
              onFocus={() => {
                // Open dropdown immediately and synchronously
                setIsDropdownOpen(true);
                // Set active state immediately
                if (onOpen) {
                  onOpen(id);
                }
                // Measure layout and trigger scroll callback
                setTimeout(() => {
                  handleInputLayout();
                  // Trigger scroll callback if provided
                  if (onFocusScroll) {
                    onFocusScroll();
                  }
                }, 100);
              }}
            />
            {!!searchQuery && (
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery('');
                  setIsDropdownOpen(true);
                }}>
                <Ionicons name="close-circle" size={18} color="#9ca3af" />
              </TouchableOpacity>
            )}
          </TouchableOpacity>

          {/* Show dropdown immediately when focused, not just when isActive */}
          {isDropdownOpen && (
            <View style={styles.dropdownWrapper}>
              <View style={styles.dropdownContainer} ref={dropdownRef}>
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled={true}
                  style={styles.optionsList}
                  contentContainerStyle={styles.optionsListContent}
                  showsVerticalScrollIndicator={true}>
                  {filteredOptions.map((item, index) =>
                    renderOption(item, index),
                  )}
                </ScrollView>
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
    zIndex: 1000,
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
