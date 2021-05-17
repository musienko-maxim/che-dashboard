/*
 * Copyright (c) 2018-2020 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import mockAxios, { AxiosError } from 'axios';
import { MockStoreEnhanced } from 'redux-mock-store';
import { FakeStoreBuilder } from '../../__mocks__/storeBuilder';
import * as brandingStore from '..';
import { AnyAction } from 'redux';
import { BRANDING_DEFAULT, BrandingData } from '../../../services/bootstrap/branding.constant';

describe('Branding store', () => {

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('actions', () => {

    it('should create RECEIVED_BRANDING when fetch has been done', async () => {
      (mockAxios.get as jest.Mock).mockResolvedValueOnce({
        data: {},
      });

      const store = new FakeStoreBuilder().build() as MockStoreEnhanced;

      await store.dispatch(brandingStore.actionCreators.requestBranding() as any);

      const actions = store.getActions();

      const expectedActions = [{
        type: 'REQUEST_BRANDING',
      }, {
        type: 'RECEIVED_BRANDING',
      }];

      expect(actions).toMatchObject(expectedActions);
    });

    it('should create RECEIVED_BRANDING_ERROR when fetch has been failed', async () => {
      (mockAxios.get as jest.Mock).mockRejectedValueOnce({
        isAxiosError: true,
        code: '500',
        message: 'expected error',
      } as AxiosError);

      const store = new FakeStoreBuilder().build() as MockStoreEnhanced;

      try {
        await store.dispatch(brandingStore.actionCreators.requestBranding() as any);
      } catch (e) {
        // noop
      }

      const actions = store.getActions();

      const expectedActions = [{
        type: 'REQUEST_BRANDING',
      }, {
        type: 'RECEIVED_BRANDING_ERROR',
      }];

      expect(actions).toMatchObject(expectedActions);
    });

  });

  describe('reducer', () => {

    it('should return initial state', () => {
      const incomingAction = {
        type: 'REQUEST_BRANDING',
      } as brandingStore.RequestBrandingAction;
      const initialState = brandingStore.reducer(undefined, incomingAction);

      const brandingDefaults = BRANDING_DEFAULT;
      brandingDefaults.logoFile = './assets/branding/' + BRANDING_DEFAULT.logoFile;
      brandingDefaults.logoTextFile = './assets/branding/' + BRANDING_DEFAULT.logoTextFile;

      const expectedState = {
        isLoading: false,
        data: brandingDefaults,
      };

      expect(initialState).toEqual(expectedState);
    });

    it('should return state', () => {
      const initialState = {
        isLoading: true,
      } as brandingStore.State;
      const incomingAction = {
        type: 'OTHER_ACTION',
      } as AnyAction;
      const newState = brandingStore.reducer(initialState, incomingAction);

      const brandingDefaults = BRANDING_DEFAULT;
      brandingDefaults.logoFile = './assets/branding/' + BRANDING_DEFAULT.logoFile;
      brandingDefaults.logoTextFile = './assets/branding/' + BRANDING_DEFAULT.logoTextFile;

      const expectedState = {
        isLoading: true,
      };

      expect(newState).toEqual(expectedState);
    });

    it('should handle REQUEST_BRANDING', () => {
      const initialState = {} as brandingStore.State;
      const incomingAction = {
        type: 'REQUEST_BRANDING',
      } as brandingStore.RequestBrandingAction;

      const newState = brandingStore.reducer(initialState, incomingAction);

      const expectedState = {
        isLoading: true,
      };

      expect(newState).toEqual(expectedState);
    });

    it('should handle RECEIVED_BRANDING', () => {
      const initialState = {} as brandingStore.State;
      const incomingAction = {
        type: 'RECEIVED_BRANDING',
        data: {
          name: 'CustomProduct',
        } as BrandingData,
      } as brandingStore.ReceivedBrandingAction;

      const newState = brandingStore.reducer(initialState, incomingAction);

      const expectedState = {
        isLoading: false,
        data: {
          name: 'CustomProduct',
        } as BrandingData,
      };

      expect(newState).toEqual(expectedState);
    });

    it('should handle RECEIVED_BRANDING_ERROR', () => {
      const initialState = {} as brandingStore.State;
      const incomingAction = {
        type: 'RECEIVED_BRANDING_ERROR',
        error: 'expected error',
      } as brandingStore.ReceivedBrandingErrorAction;

      const newState = brandingStore.reducer(initialState, incomingAction);

      const expectedState = {
        isLoading: false,
        error: 'expected error',
      };

      expect(newState).toEqual(expectedState);
    });

  });

});
