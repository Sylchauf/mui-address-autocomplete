import { LocationOn } from '@mui/icons-material';
import { Autocomplete, Box, Grid, TextField, Typography } from '@mui/material';
import parse from 'autosuggest-highlight/parse';
import throttle from 'lodash.throttle';
import React, { useCallback, useEffect, useMemo } from 'react';


const autocompleteService: { current: google.maps.places.AutocompleteService | null } = { current: null };

export interface AddressAutocompleteProps {
  apiKey: string;
  label: string;
  [x:string]: any;
}

const AddressAutocomplete = ({
  apiKey,
  label,
  rest
}: AddressAutocompleteProps) => {
  const loaded = React.useRef(false);
  const [addressOptions, setAddressOptions] = React.useState<unknown[]>([]);
  const [addressValue, setAddressValue] = React.useState<unknown>(null);
  const [addressInputValue, setAddressInputValue] = React.useState('');

  // Options label
  const getOptionLabel = useCallback((option) => (typeof option === 'string' ? option : option.description), []);

  // Empty filter
  const filterOptions = useCallback((x) => x, []);

  // Address selection
  const selectAddress = useCallback((_, newValue) => {
    setAddressOptions((previous) => (newValue ? [newValue, ...previous] : previous));
    setAddressValue(newValue);
  }, []);

  // Address input change
  const searchAddress = useCallback((_, newInputValue) => {
    setAddressInputValue(newInputValue);
  }, []);

  // Address input renderer
  const renderAddressInput = useCallback((params) => (
    <TextField {...params} fullWidth label={label} />
  ), []);

  // Options renderer
  const renderAddressOption = useCallback((props, option) => {
    const {
      structured_formatting: {
        main_text_matched_substrings: matches
      }
    }: { structured_formatting: { main_text_matched_substrings: [{ offset: number; length: number }] } } = option;
    const parts = parse(
      option.structured_formatting.main_text,
      matches.map((match) => [match.offset, match.offset + match.length]),
    );

    return (
      <li {...props}>
        <Grid alignItems="center" container>
          <Grid item>
            <Box
              component={LocationOn}
              sx={{ mr: 2 }}
            />
          </Grid>
          <Grid item xs>
            {parts.map((part, index) => (
              <span
                key={index}
                style={{ fontWeight: part.highlight ? 700 : 400 }}
              >
                {part.text}
              </span>
            ))}

            <Typography variant="body2">
              {option.structured_formatting.secondary_text}
            </Typography>
          </Grid>
        </Grid>
      </li>
    );
  }, []);

  // Load Google Maps API script if not already loaded
  if (typeof window !== 'undefined' && !loaded.current) {
    if (!document.querySelector('#google-maps')) {
      const script = document.createElement('script');

      script.setAttribute('async', '');
      script.setAttribute('id', 'google-maps');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      document.querySelector('head')!.appendChild(script);
    }

    loaded.current = true;
  }

  // Autocomplete predictions fetcher
  const fetch = useMemo(() => throttle((request, callback) => {
    if (autocompleteService.current) autocompleteService.current.getPlacePredictions(request, callback);
  }, 200), []);

  // Runs on input change
  useEffect(() => {
    // Lock worker
    let active = true;

    // Initialize Google Maps Autocomplete Service
    if (!autocompleteService.current && window.google) {
      autocompleteService.current = new window.google.maps.places.AutocompleteService();
    }
    // Stop execution if the service is not available
    if (!autocompleteService.current) {
      return undefined;
    }

    // Hide options when input is empty
    if (addressInputValue === '') {
      setAddressOptions(addressValue ? [addressValue] : []);
      return undefined;
    }

    // Fetch autocomplete predictions
    fetch({ input: addressInputValue }, (results: unknown[]) => {
      if (active) {
        let newOptions: unknown[] = [];

        // Include selected address
        if (addressValue) {
          newOptions = [addressValue];
        }

        // Include fetched predictions
        if (results) {
          newOptions = [...newOptions, ...results];
        }

        setAddressOptions(newOptions);
      }
    });

    return () => {
      // Unlock worker
      active = false;
    };
  }, [addressValue, addressInputValue, fetch]);

  return (
    <Autocomplete
      autoComplete
      filterOptions={filterOptions}
      filterSelectedOptions
      fullWidth
      getOptionLabel={getOptionLabel}
      includeInputInList
      onChange={selectAddress}
      onInputChange={searchAddress}
      options={addressOptions}
      renderInput={renderAddressInput}
      renderOption={renderAddressOption}
      value={addressValue}
      {...rest}
    />
  );
};

export default AddressAutocomplete;